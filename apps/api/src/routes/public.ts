import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { first } from "../lib/first.js";
import { verifyTurnstile } from "../lib/turnstile.js";
import { notifyNewEnquiry } from "../lib/mail.js";
import { makeReference } from "../lib/slug.js";
import { visitorHash } from "../lib/crypto.js";

const CACHE = "public, s-maxage=60, stale-while-revalidate=300";

export const productSelect = {
  id: schema.products.id,
  slug: schema.products.slug,
  name: schema.products.name,
  shortDescription: schema.products.shortDescription,
  description: schema.products.description,
  specs: schema.products.specs,
  variants: schema.products.variants,
  priceFrom: schema.products.priceFrom,
  unit: schema.products.unit,
  inStock: schema.products.inStock,
  isFeatured: schema.products.isFeatured,
  categoryId: schema.products.categoryId,
  categoryName: schema.categories.name,
  categorySlug: schema.categories.slug,
  sortOrder: schema.products.sortOrder,
};

async function attachImages<T extends { id: string }>(rows: T[]) {
  if (rows.length === 0) return [] as (T & { images: typeof schema.productImages.$inferSelect[] })[];
  const imgs = await db
    .select()
    .from(schema.productImages)
    .where(sql`${schema.productImages.productId} in ${rows.map((r) => r.id)}`)
    .orderBy(asc(schema.productImages.sortOrder));
  const map = new Map<string, typeof imgs>();
  for (const i of imgs) map.set(i.productId, [...(map.get(i.productId) ?? []), i]);
  return rows.map((r) => ({ ...r, images: map.get(r.id) ?? [] }));
}

/* Shared anti-spam envelope for every public form */
const antiSpam = z.object({
  turnstileToken: z.string().max(4096).optional(),
  /** Honeypot: real users never fill this. */
  website: z.string().max(0).optional().or(z.literal("")),
  /** Timing trap: form render timestamp (ms). Submissions under 3s are bots. */
  startedAt: z.coerce.number().int().positive(),
});

const contactBody = antiSpam.extend({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(3000),
});

const quoteBody = antiSpam.extend({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  phone: z.string().trim().min(6).max(30),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  message: z.string().trim().max(3000).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variant: z.string().trim().max(120).optional().or(z.literal("")),
        quantity: z.coerce.number().int().min(1).max(100000),
        note: z.string().trim().max(300).optional().or(z.literal("")),
      }),
    )
    .min(1)
    .max(40),
});

const LINK_RE = /(https?:\/\/|www\.)/gi;
function looksSpammy(text: string) {
  const links = text.match(LINK_RE)?.length ?? 0;
  return links > 2 || /\[url=|<a\s/i.test(text);
}

const publicRoutes: FastifyPluginAsync = async (app) => {
  /* ── Catalogue ─────────────────────────────────────── */

  app.get("/categories", async (_req, reply) => {
    const rows = await db
      .select({
        id: schema.categories.id,
        slug: schema.categories.slug,
        name: schema.categories.name,
        description: schema.categories.description,
        imageUrl: schema.categories.imageUrl,
        sortOrder: schema.categories.sortOrder,
        productCount: sql<number>`(select count(*)::int from ${schema.products} p where p.category_id = categories.id and p.is_active = true)`,
      })
      .from(schema.categories)
      .where(eq(schema.categories.isActive, true))
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name));
    reply.header("cache-control", CACHE);
    return rows;
  });

  app.get("/products", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          category: { type: "string", maxLength: 80 },
          q: { type: "string", maxLength: 80 },
          featured: { type: "string" },
          limit: { type: "integer", minimum: 1, maximum: 100 },
          offset: { type: "integer", minimum: 0 },
        },
      },
    },
  }, async (req, reply) => {
    const q = req.query as { category?: string; q?: string; featured?: string; limit?: number; offset?: number };
    const limit = q.limit ?? 60;
    const offset = q.offset ?? 0;
    const where = and(
      eq(schema.products.isActive, true),
      eq(schema.categories.isActive, true),
      q.category ? eq(schema.categories.slug, q.category) : undefined,
      q.featured === "true" ? eq(schema.products.isFeatured, true) : undefined,
      q.q ? or(ilike(schema.products.name, `%${q.q}%`), ilike(schema.products.description, `%${q.q}%`)) : undefined,
    );

    const [rows, { total }] = await Promise.all([
      db
        .select(productSelect)
        .from(schema.products)
        .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(where)
        .orderBy(desc(schema.products.isFeatured), asc(schema.products.sortOrder), asc(schema.products.name))
        .limit(limit)
        .offset(offset),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(schema.products)
        .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(where).then(first),
    ]);

    reply.header("cache-control", CACHE);
    return { items: await attachImages(rows), total, limit, offset };
  });

  app.get("/products/:slug", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    if (!/^[a-z0-9-]{1,80}$/.test(slug)) return reply.notFound();
    const [row] = await db
      .select(productSelect)
      .from(schema.products)
      .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(and(eq(schema.products.slug, slug), eq(schema.products.isActive, true)))
      .limit(1);
    if (!row) return reply.notFound();

    const [product] = await attachImages([row]);
    const related = await attachImages(
      await db
        .select(productSelect)
        .from(schema.products)
        .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
        .where(and(eq(schema.products.categoryId, row.categoryId), eq(schema.products.isActive, true), sql`${schema.products.id} <> ${row.id}`))
        .orderBy(asc(schema.products.sortOrder))
        .limit(4),
    );

    // Fire-and-forget view counter
    db.update(schema.products)
      .set({ viewCount: sql`${schema.products.viewCount} + 1` })
      .where(eq(schema.products.id, row.id))
      .catch(() => {});

    reply.header("cache-control", CACHE);
    return { ...product, related };
  });

  app.get("/highlights", async (_req, reply) => {
    const rows = await db.select().from(schema.highlights).where(eq(schema.highlights.isActive, true)).orderBy(asc(schema.highlights.sortOrder));
    reply.header("cache-control", CACHE);
    return rows;
  });

  app.get("/settings", async (_req, reply) => {
    const rows = await db.select().from(schema.siteSettings).where(sql`${schema.siteSettings.key} in ('contact','company')`);
    reply.header("cache-control", CACHE);
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  });

  /* ── Forms (strict rate limits) ─────────────────────── */

  const formLimit = { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } };

  async function guard(req: FastifyRequest, body: z.infer<typeof antiSpam>, text: string) {
    if (body.website) return "Rejected"; // honeypot
    if (Date.now() - body.startedAt < 3000) return "Please take a moment before submitting";
    if (looksSpammy(text)) return "Message looks like spam";
    if (!(await verifyTurnstile(body.turnstileToken, req.ip))) return "Verification failed, please try again";
    return null;
  }

  async function nextReference() {
    const { n } = first(await db.select({ n: sql<number>`count(*)::int` }).from(schema.enquiries));
    return makeReference(n + 1);
  }

  app.post("/contact", formLimit, async (req, reply) => {
    const parsed = contactBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    const b = parsed.data;
    const rejected = await guard(req, b, b.message);
    if (rejected) return reply.code(400).send({ error: rejected });

    const reference = await nextReference();
    const [row] = await db
      .insert(schema.enquiries)
      .values({
        reference,
        type: "contact",
        name: b.name,
        email: b.email.toLowerCase(),
        phone: b.phone || null,
        company: b.company || null,
        message: b.message,
        ipAddress: req.ip,
        userAgent: (req.headers["user-agent"] ?? "").slice(0, 300),
      })
      .returning({ id: schema.enquiries.id });

    notifyNewEnquiry({ reference, type: "contact", ...b }).catch((err) => req.log.error({ err }, "mail failed"));
    return reply.code(201).send({ ok: true, reference, id: row!.id });
  });

  app.post("/quotes", formLimit, async (req, reply) => {
    const parsed = quoteBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Invalid input", details: parsed.error.flatten().fieldErrors });
    const b = parsed.data;
    const rejected = await guard(req, b, b.message ?? "");
    if (rejected) return reply.code(400).send({ error: rejected });

    const ids = [...new Set(b.items.map((i) => i.productId))];
    const prods = await db
      .select({ id: schema.products.id, name: schema.products.name })
      .from(schema.products)
      .where(and(eq(schema.products.isActive, true), sql`${schema.products.id} in ${ids}`));
    const nameById = new Map(prods.map((p) => [p.id, p.name]));
    const items = b.items.filter((i) => nameById.has(i.productId));
    if (items.length === 0) return reply.code(400).send({ error: "No valid products in request" });

    const reference = await nextReference();
    const enquiryId = await db.transaction(async (tx) => {
      const [e] = await tx
        .insert(schema.enquiries)
        .values({
          reference,
          type: "quote",
          name: b.name,
          email: b.email.toLowerCase(),
          phone: b.phone,
          company: b.company || null,
          location: b.location || null,
          message: b.message || "",
          ipAddress: req.ip,
          userAgent: (req.headers["user-agent"] ?? "").slice(0, 300),
        })
        .returning({ id: schema.enquiries.id });
      await tx.insert(schema.enquiryItems).values(
        items.map((i) => ({
          enquiryId: e!.id,
          productId: i.productId,
          productName: nameById.get(i.productId)!,
          variant: i.variant || null,
          quantity: i.quantity,
          note: i.note || null,
        })),
      );
      return e!.id;
    });

    notifyNewEnquiry({
      reference,
      type: "quote",
      name: b.name,
      email: b.email,
      phone: b.phone,
      company: b.company,
      location: b.location,
      message: b.message || "(no message)",
      items: items.map((i) => ({ productName: nameById.get(i.productId)!, variant: i.variant, quantity: i.quantity, note: i.note })),
    }).catch((err) => req.log.error({ err }, "mail failed"));

    return reply.code(201).send({ ok: true, reference, id: enquiryId });
  });

  /* ── Privacy-friendly analytics beacon ─────────────── */
  app.post("/analytics/view", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = z.object({ path: z.string().max(200), referrer: z.string().max(300).optional() }).safeParse(req.body);
    if (!body.success) return reply.code(204).send();
    const path = body.data.path.startsWith("/") ? body.data.path.split("?")[0]! : "/";
    if (path.startsWith("/admin")) return reply.code(204).send();
    await db
      .insert(schema.pageViews)
      .values({
        path,
        referrer: body.data.referrer?.slice(0, 300) || null,
        country: (req.headers["cf-ipcountry"] as string | undefined) ?? (req.headers["x-vercel-ip-country"] as string | undefined) ?? null,
        visitorHash: visitorHash(req.ip, req.headers["user-agent"] ?? ""),
      })
      .catch(() => {});
    return reply.code(204).send();
  });
};

export default publicRoutes;
