import type { FastifyPluginAsync } from "fastify";
import multipart from "@fastify/multipart";
import { z } from "zod";
import argon2 from "argon2";
import { and, asc, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { first } from "../lib/first.js";
import { audit } from "../lib/audit.js";
import { slugify } from "../lib/slug.js";
import { MAX_UPLOAD_BYTES, deleteStored, processAndUpload, storageEnabled } from "../lib/storage.js";
import { revalidateWeb } from "../lib/revalidate.js";
import { randomToken } from "../lib/crypto.js";
import { sendAdminInvite } from "../lib/mail.js";
import { ARGON } from "./auth.js";
import { productSelect } from "./public.js";

const uuid = z.string().uuid();
const httpUrl = z.string().url().max(600).refine((u) => /^https:\/\//.test(u), "Only https URLs are allowed");

const categoryBody = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/).optional(),
  description: z.string().trim().max(600).default(""),
  imageUrl: httpUrl.nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  isActive: z.boolean().default(true),
});

const productBody = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9-]{2,80}$/).optional(),
  categoryId: uuid,
  shortDescription: z.string().trim().max(300).default(""),
  description: z.string().trim().max(5000).default(""),
  specs: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  variants: z.array(z.object({ label: z.string().trim().min(1).max(60), options: z.array(z.string().trim().min(1).max(60)).min(1).max(30) })).max(10).default([]),
  priceFrom: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
  unit: z.string().trim().max(40).default("per unit"),
  inStock: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
});

const highlightBody = z.object({
  title: z.string().trim().min(2).max(100),
  subtitle: z.string().trim().max(200).default(""),
  ctaLabel: z.string().trim().max(40).default("Browse products"),
  ctaHref: z.string().trim().regex(/^\/[a-zA-Z0-9\-_/?=&]*$/, "Must be a relative path like /products").default("/products"),
  imageUrl: httpUrl,
  storagePath: z.string().max(300).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

const adminRoutes: FastifyPluginAsync = async (app) => {
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 5 } });

  // Every route in this plugin requires a valid admin session.
  app.addHook("preHandler", app.requireAuth());
  const ownerOnly = app.requireAuth(["owner"]);

  /* ── Dashboard ─────────────────────────────────────── */
  app.get("/dashboard", async () => {
    const [counts, enq, views, topProducts, recent, byStatus, byDay] = await Promise.all([
      db.select({
        products: sql<number>`(select count(*)::int from ${schema.products} where is_active = true)`,
        categories: sql<number>`(select count(*)::int from ${schema.categories} where is_active = true)`,
        outOfStock: sql<number>`(select count(*)::int from ${schema.products} where is_active = true and in_stock = false)`,
        admins: sql<number>`(select count(*)::int from ${schema.admins} where is_active = true)`,
      }).from(sql`(select 1) as t`).then(first),
      db.select({
        total: sql<number>`count(*)::int`,
        unread: sql<number>`count(*) filter (where is_read = false)::int`,
        last7: sql<number>`count(*) filter (where created_at > now() - interval '7 days')::int`,
        prev7: sql<number>`count(*) filter (where created_at between now() - interval '14 days' and now() - interval '7 days')::int`,
        quotes30: sql<number>`count(*) filter (where type = 'quote' and created_at > now() - interval '30 days')::int`,
      }).from(schema.enquiries).then(first),
      db.select({
        last30: sql<number>`count(*) filter (where created_at > now() - interval '30 days')::int`,
        prev30: sql<number>`count(*) filter (where created_at between now() - interval '60 days' and now() - interval '30 days')::int`,
        visitors30: sql<number>`count(distinct visitor_hash) filter (where created_at > now() - interval '30 days')::int`,
      }).from(schema.pageViews).then(first),
      db.select({ id: schema.products.id, name: schema.products.name, slug: schema.products.slug, viewCount: schema.products.viewCount })
        .from(schema.products).orderBy(desc(schema.products.viewCount)).limit(5),
      db.select().from(schema.enquiries).orderBy(desc(schema.enquiries.createdAt)).limit(6),
      db.select({ status: schema.enquiries.status, n: sql<number>`count(*)::int` }).from(schema.enquiries).groupBy(schema.enquiries.status),
      db.execute<{ day: string; views: number; enquiries: number }>(sql`
        with days as (select generate_series(current_date - interval '29 days', current_date, interval '1 day')::date as day)
        select to_char(d.day,'YYYY-MM-DD') as day,
               (select count(*)::int from page_views v where v.created_at::date = d.day) as views,
               (select count(*)::int from enquiries e where e.created_at::date = d.day) as enquiries
        from days d order by d.day`),
    ]);
    return {
      counts,
      enquiries: enq,
      traffic: views,
      topProducts,
      recentEnquiries: recent,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r.n])),
      series: byDay.rows,
    };
  });

  /* ── Uploads ───────────────────────────────────────── */
  app.post("/uploads", { config: { rateLimit: { max: 60, timeWindow: "10 minutes" } } }, async (req, reply) => {
    if (!storageEnabled()) return reply.code(503).send({ error: "Image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." });
    const file = await req.file();
    if (!file) return reply.code(400).send({ error: "No file" });
    const folder = (file.fields.folder as { value?: string } | undefined)?.value;
    const target = folder === "categories" || folder === "highlights" ? folder : "products";
    try {
      const buf = await file.toBuffer();
      const stored = await processAndUpload(buf, file.mimetype, target);
      await audit(req, "upload.create", { meta: { path: stored.storagePath, bytes: buf.byteLength } });
      return stored;
    } catch (err) {
      if (file.file.truncated) return reply.code(413).send({ error: "Image too large (max 15 MB)" });
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  /* ── Categories ────────────────────────────────────── */
  app.get("/categories", async () =>
    db
      .select({
        ...getTableColumns(schema.categories),
        productCount: sql<number>`(select count(*)::int from ${schema.products} p where p.category_id = categories.id)`,
      })
      .from(schema.categories)
      .orderBy(asc(schema.categories.sortOrder), asc(schema.categories.name)),
  );

  app.post("/categories", async (req, reply) => {
    const b = categoryBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "Invalid input", details: b.error.flatten().fieldErrors });
    const slug = b.data.slug ?? slugify(b.data.name);
    const [row] = await db.insert(schema.categories).values({ ...b.data, slug }).onConflictDoNothing().returning();
    if (!row) return reply.code(409).send({ error: "A category with this slug already exists" });
    await audit(req, "category.create", { entity: "category", entityId: row.id, meta: { name: row.name } });
    await revalidateWeb(["categories", "products"]);
    return reply.code(201).send(row);
  });

  app.put("/categories/:id", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    const b = categoryBody.partial().safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send({ error: "Invalid input" });
    const [row] = await db.update(schema.categories).set({ ...b.data, updatedAt: new Date() }).where(eq(schema.categories.id, id.data)).returning();
    if (!row) return reply.notFound();
    await audit(req, "category.update", { entity: "category", entityId: row.id });
    await revalidateWeb(["categories", "products"]);
    return row;
  });

  app.delete("/categories/:id", { preHandler: app.requireAuth(["owner", "admin"]) }, async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: "Invalid id" });
    const { n } = first(await db.select({ n: sql<number>`count(*)::int` }).from(schema.products).where(eq(schema.products.categoryId, id.data)));
    if (n > 0) return reply.code(409).send({ error: `Move or delete the ${n} product(s) in this category first` });
    const [row] = await db.delete(schema.categories).where(eq(schema.categories.id, id.data)).returning();
    if (!row) return reply.notFound();
    await audit(req, "category.delete", { entity: "category", entityId: row.id, meta: { name: row.name } });
    await revalidateWeb(["categories"]);
    return { ok: true };
  });

  /* ── Products ──────────────────────────────────────── */
  app.get("/products", async (req) => {
    const q = req.query as { q?: string; category?: string; status?: string };
    const rows = await db
      .select({ ...productSelect, isActive: schema.products.isActive, viewCount: schema.products.viewCount, updatedAt: schema.products.updatedAt })
      .from(schema.products)
      .innerJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(
        and(
          q.q ? or(ilike(schema.products.name, `%${q.q.slice(0, 80)}%`), ilike(schema.products.slug, `%${q.q.slice(0, 80)}%`)) : undefined,
          q.category ? eq(schema.categories.slug, q.category) : undefined,
          q.status === "active" ? eq(schema.products.isActive, true) : q.status === "hidden" ? eq(schema.products.isActive, false) : undefined,
        ),
      )
      .orderBy(asc(schema.products.sortOrder), asc(schema.products.name));
    const imgs = rows.length
      ? await db.select().from(schema.productImages).where(sql`${schema.productImages.productId} in ${rows.map((r) => r.id)}`).orderBy(asc(schema.productImages.sortOrder))
      : [];
    const map = new Map<string, typeof imgs>();
    for (const i of imgs) map.set(i.productId, [...(map.get(i.productId) ?? []), i]);
    return rows.map((r) => ({ ...r, images: map.get(r.id) ?? [] }));
  });

  app.get("/products/:id", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: "Invalid id" });
    const row = await db.query.products.findFirst({ where: eq(schema.products.id, id.data), with: { images: { orderBy: asc(schema.productImages.sortOrder) }, category: true } });
    if (!row) return reply.notFound();
    return row;
  });

  app.post("/products", async (req, reply) => {
    const b = productBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "Invalid input", details: b.error.flatten().fieldErrors });
    const slug = b.data.slug ?? slugify(b.data.name);
    const [row] = await db.insert(schema.products).values({ ...b.data, slug, priceFrom: b.data.priceFrom ?? null }).onConflictDoNothing().returning();
    if (!row) return reply.code(409).send({ error: "A product with this slug already exists" });
    await audit(req, "product.create", { entity: "product", entityId: row.id, meta: { name: row.name } });
    await revalidateWeb(["products"]);
    return reply.code(201).send(row);
  });

  app.put("/products/:id", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    const b = productBody.partial().safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send({ error: "Invalid input", details: !b.success ? b.error.flatten().fieldErrors : undefined });
    const [row] = await db.update(schema.products).set({ ...b.data, updatedAt: new Date() }).where(eq(schema.products.id, id.data)).returning();
    if (!row) return reply.notFound();
    await audit(req, "product.update", { entity: "product", entityId: row.id, meta: { fields: Object.keys(b.data) } });
    await revalidateWeb(["products", `product:${row.slug}`]);
    return row;
  });

  app.delete("/products/:id", { preHandler: app.requireAuth(["owner", "admin"]) }, async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: "Invalid id" });
    const imgs = await db.select().from(schema.productImages).where(eq(schema.productImages.productId, id.data));
    const [row] = await db.delete(schema.products).where(eq(schema.products.id, id.data)).returning();
    if (!row) return reply.notFound();
    await Promise.allSettled(imgs.map((i) => deleteStored(i.storagePath)));
    await audit(req, "product.delete", { entity: "product", entityId: row.id, meta: { name: row.name } });
    await revalidateWeb(["products"]);
    return { ok: true };
  });

  /* Reorder products: body = [{id, sortOrder}] */
  app.post("/products/reorder", async (req, reply) => {
    const b = z.array(z.object({ id: uuid, sortOrder: z.number().int().min(0) })).max(500).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "Invalid input" });
    await db.transaction(async (tx) => {
      for (const p of b.data) await tx.update(schema.products).set({ sortOrder: p.sortOrder }).where(eq(schema.products.id, p.id));
    });
    await revalidateWeb(["products"]);
    return { ok: true };
  });

  /* Product images */
  app.post("/products/:id/images", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    const b = z
      .object({
        url: httpUrl,
        thumbUrl: httpUrl.optional(),
        storagePath: z.string().max(300).nullable().optional(),
        width: z.number().int().positive().optional(),
        height: z.number().int().positive().optional(),
        alt: z.string().trim().max(160).default(""),
      })
      .safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send({ error: "Invalid input" });
    const { n } = first(await db.select({ n: sql<number>`count(*)::int` }).from(schema.productImages).where(eq(schema.productImages.productId, id.data)));
    if (n >= 12) return reply.code(409).send({ error: "Maximum 12 images per product" });
    // Drop seed placeholder once a real image arrives
    await db.delete(schema.productImages).where(and(eq(schema.productImages.productId, id.data), eq(schema.productImages.url, "/placeholder-product.svg")));
    const [row] = await db
      .insert(schema.productImages)
      .values({ productId: id.data, url: b.data.url, thumbUrl: b.data.thumbUrl ?? b.data.url, storagePath: b.data.storagePath ?? null, width: b.data.width, height: b.data.height, alt: b.data.alt, sortOrder: n })
      .returning();
    const prod = await db.query.products.findFirst({ where: eq(schema.products.id, id.data), columns: { slug: true } });
    await revalidateWeb(["products", `product:${prod?.slug}`]);
    return reply.code(201).send(row);
  });

  app.put("/products/:id/images/order", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    const b = z.array(uuid).max(12).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send({ error: "Invalid input" });
    await db.transaction(async (tx) => {
      for (const [i, imgId] of b.data.entries())
        await tx.update(schema.productImages).set({ sortOrder: i }).where(and(eq(schema.productImages.id, imgId), eq(schema.productImages.productId, id.data)));
    });
    await revalidateWeb(["products"]);
    return { ok: true };
  });

  app.delete("/products/:id/images/:imageId", async (req, reply) => {
    const p = z.object({ id: uuid, imageId: uuid }).safeParse(req.params);
    if (!p.success) return reply.code(400).send({ error: "Invalid id" });
    const [row] = await db.delete(schema.productImages).where(and(eq(schema.productImages.id, p.data.imageId), eq(schema.productImages.productId, p.data.id))).returning();
    if (!row) return reply.notFound();
    await deleteStored(row.storagePath);
    await revalidateWeb(["products"]);
    return { ok: true };
  });

  /* ── Highlights (hero) ─────────────────────────────── */
  app.get("/highlights", async () => db.select().from(schema.highlights).orderBy(asc(schema.highlights.sortOrder)));
  app.post("/highlights", async (req, reply) => {
    const b = highlightBody.safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "Invalid input", details: b.error.flatten().fieldErrors });
    const [row] = await db.insert(schema.highlights).values(b.data).returning();
    await audit(req, "highlight.create", { entity: "highlight", entityId: row!.id });
    await revalidateWeb(["highlights"]);
    return reply.code(201).send(row);
  });
  app.put("/highlights/:id", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    const b = highlightBody.partial().safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send({ error: "Invalid input" });
    const [row] = await db.update(schema.highlights).set({ ...b.data, updatedAt: new Date() }).where(eq(schema.highlights.id, id.data)).returning();
    if (!row) return reply.notFound();
    await audit(req, "highlight.update", { entity: "highlight", entityId: row.id });
    await revalidateWeb(["highlights"]);
    return row;
  });
  app.delete("/highlights/:id", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: "Invalid id" });
    const [row] = await db.delete(schema.highlights).where(eq(schema.highlights.id, id.data)).returning();
    if (!row) return reply.notFound();
    await deleteStored(row.storagePath);
    await audit(req, "highlight.delete", { entity: "highlight", entityId: row.id });
    await revalidateWeb(["highlights"]);
    return { ok: true };
  });

  /* ── Enquiries ─────────────────────────────────────── */
  app.get("/enquiries", async (req) => {
    const q = req.query as { status?: string; type?: string; q?: string; limit?: string; offset?: string };
    const limit = Math.min(Number(q.limit) || 50, 200);
    const offset = Math.max(Number(q.offset) || 0, 0);
    const where = and(
      q.status && (schema.enquiryStatus as readonly string[]).includes(q.status) ? eq(schema.enquiries.status, q.status as schema.EnquiryStatus) : undefined,
      q.type === "quote" || q.type === "contact" ? eq(schema.enquiries.type, q.type) : undefined,
      q.q ? or(ilike(schema.enquiries.name, `%${q.q.slice(0, 80)}%`), ilike(schema.enquiries.email, `%${q.q.slice(0, 80)}%`), ilike(schema.enquiries.reference, `%${q.q.slice(0, 80)}%`), ilike(schema.enquiries.company, `%${q.q.slice(0, 80)}%`)) : undefined,
    );
    const [items, { total }] = await Promise.all([
      db.query.enquiries.findMany({ where, with: { items: true }, orderBy: desc(schema.enquiries.createdAt), limit, offset }),
      db.select({ total: sql<number>`count(*)::int` }).from(schema.enquiries).where(where).then(first),
    ]);
    return { items, total, limit, offset };
  });

  app.get("/enquiries/:id", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: "Invalid id" });
    const row = await db.query.enquiries.findFirst({ where: eq(schema.enquiries.id, id.data), with: { items: { with: { product: { columns: { slug: true } } } } } });
    if (!row) return reply.notFound();
    if (!row.isRead) await db.update(schema.enquiries).set({ isRead: true }).where(eq(schema.enquiries.id, row.id));
    return { ...row, isRead: true };
  });

  app.patch("/enquiries/:id", async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    const b = z.object({ status: z.enum(schema.enquiryStatus).optional(), adminNotes: z.string().max(5000).optional(), isRead: z.boolean().optional() }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send({ error: "Invalid input" });
    const [row] = await db.update(schema.enquiries).set({ ...b.data, updatedAt: new Date() }).where(eq(schema.enquiries.id, id.data)).returning();
    if (!row) return reply.notFound();
    await audit(req, "enquiry.update", { entity: "enquiry", entityId: row.id, meta: b.data.status ? { status: b.data.status } : undefined });
    return row;
  });

  app.delete("/enquiries/:id", { preHandler: app.requireAuth(["owner", "admin"]) }, async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: "Invalid id" });
    const [row] = await db.delete(schema.enquiries).where(eq(schema.enquiries.id, id.data)).returning();
    if (!row) return reply.notFound();
    await audit(req, "enquiry.delete", { entity: "enquiry", entityId: row.id, meta: { reference: row.reference } });
    return { ok: true };
  });

  /* ── Settings ──────────────────────────────────────── */
  app.get("/settings", async () => Object.fromEntries((await db.select().from(schema.siteSettings)).map((r) => [r.key, r.value])));
  app.put("/settings/:key", { preHandler: app.requireAuth(["owner", "admin"]) }, async (req, reply) => {
    const key = z.enum(["contact", "company", "seo", "social"]).safeParse((req.params as { key: string }).key);
    const value = z.record(z.string().max(60), z.union([z.string().max(1000), z.number(), z.boolean()])).safeParse(req.body);
    if (!key.success || !value.success) return reply.code(400).send({ error: "Invalid input" });
    await db.insert(schema.siteSettings).values({ key: key.data, value: value.data }).onConflictDoUpdate({ target: schema.siteSettings.key, set: { value: value.data, updatedAt: new Date() } });
    await audit(req, "settings.update", { entity: "settings", entityId: key.data });
    await revalidateWeb(["settings"]);
    return { ok: true };
  });

  /* ── Team (owner only) ─────────────────────────────── */
  app.get("/team", { preHandler: ownerOnly }, async () =>
    db
      .select({ id: schema.admins.id, email: schema.admins.email, name: schema.admins.name, role: schema.admins.role, totpEnabled: schema.admins.totpEnabled, isActive: schema.admins.isActive, lastLoginAt: schema.admins.lastLoginAt, createdAt: schema.admins.createdAt })
      .from(schema.admins)
      .orderBy(asc(schema.admins.createdAt)),
  );

  app.post("/team", { preHandler: ownerOnly }, async (req, reply) => {
    const b = z.object({ email: z.string().email().max(120), name: z.string().trim().min(2).max(80), role: z.enum(["admin", "editor"]) }).safeParse(req.body);
    if (!b.success) return reply.code(400).send({ error: "Invalid input" });
    const temp = randomToken(12);
    const [row] = await db
      .insert(schema.admins)
      .values({ email: b.data.email.toLowerCase(), name: b.data.name, role: b.data.role, passwordHash: await argon2.hash(temp, ARGON), mustChangePassword: true })
      .onConflictDoNothing()
      .returning({ id: schema.admins.id, email: schema.admins.email });
    if (!row) return reply.code(409).send({ error: "An account with this email already exists" });
    await sendAdminInvite(row.email, b.data.name, temp);
    await audit(req, "team.invite", { entity: "admin", entityId: row.id, meta: { email: row.email, role: b.data.role } });
    return reply.code(201).send({ ok: true, id: row.id });
  });

  app.patch("/team/:id", { preHandler: ownerOnly }, async (req, reply) => {
    const id = uuid.safeParse((req.params as { id: string }).id);
    const b = z.object({ role: z.enum(["admin", "editor"]).optional(), isActive: z.boolean().optional() }).safeParse(req.body);
    if (!id.success || !b.success) return reply.code(400).send({ error: "Invalid input" });
    if (id.data === req.admin!.sub) return reply.code(400).send({ error: "You cannot modify your own account here" });
    const [row] = await db.update(schema.admins).set({ ...b.data, updatedAt: new Date() }).where(and(eq(schema.admins.id, id.data), sql`${schema.admins.role} <> 'owner'`)).returning({ id: schema.admins.id });
    if (!row) return reply.notFound();
    if (b.data.isActive === false) await db.update(schema.refreshTokens).set({ revokedAt: new Date() }).where(eq(schema.refreshTokens.adminId, id.data));
    await audit(req, "team.update", { entity: "admin", entityId: row.id, meta: b.data });
    return { ok: true };
  });

  /* ── Audit log ─────────────────────────────────────── */
  app.get("/audit", { preHandler: app.requireAuth(["owner", "admin"]) }, async (req) => {
    const q = req.query as { limit?: string; offset?: string };
    const limit = Math.min(Number(q.limit) || 50, 200);
    const offset = Math.max(Number(q.offset) || 0, 0);
    const [items, { total }] = await Promise.all([
      db.select().from(schema.auditLogs).orderBy(desc(schema.auditLogs.createdAt)).limit(limit).offset(offset),
      db.select({ total: sql<number>`count(*)::int` }).from(schema.auditLogs).then(first),
    ]);
    return { items, total, limit, offset };
  });
};

export default adminRoutes;
