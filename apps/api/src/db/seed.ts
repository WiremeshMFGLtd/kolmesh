/**
 * Seeds categories, products and hero highlights from the legacy catalogue.
 * Safe to re-run: upserts by slug and skips products that already exist.
 * Image paths from the old site are kept as placeholders until real images
 * are uploaded through the admin dashboard.
 */
import { readFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "./index.js";

type Seed = {
  categories: { slug: string; name: string; description: string; image: string; sortOrder: number }[];
  products: {
    slug: string;
    name: string;
    categorySlug: string;
    description: string;
    specs: string[];
    images: string[];
    isFeatured: boolean;
    inStock: boolean;
    sortOrder: number;
  }[];
  highlights: { title: string; subtitle: string; ctaLabel: string; ctaHref: string; image: string; sortOrder: number }[];
};

const seed: Seed = JSON.parse(readFileSync(new URL("./seed-data.json", import.meta.url), "utf8"));
const PLACEHOLDER = "/placeholder-product.svg";

console.log("⏳ Seeding…");
const catIds = new Map<string, string>();

for (const c of seed.categories) {
  const [row] = await db
    .insert(schema.categories)
    .values({ slug: c.slug, name: c.name, description: c.description, imageUrl: null, sortOrder: c.sortOrder })
    .onConflictDoUpdate({
      target: schema.categories.slug,
      set: { name: c.name, description: c.description, sortOrder: c.sortOrder },
    })
    .returning({ id: schema.categories.id });
  catIds.set(c.slug, row!.id);
}

let inserted = 0;
for (const p of seed.products) {
  const exists = await db.query.products.findFirst({ where: eq(schema.products.slug, p.slug) });
  if (exists) continue;
  const [row] = await db
    .insert(schema.products)
    .values({
      slug: p.slug,
      name: p.name,
      categoryId: catIds.get(p.categorySlug)!,
      shortDescription: p.description.split(". ")[0] + ".",
      description: p.description,
      specs: p.specs,
      inStock: p.inStock,
      isFeatured: p.isFeatured,
      sortOrder: p.sortOrder,
    })
    .returning({ id: schema.products.id });
  // Keep a single placeholder image so the UI never renders empty.
  await db.insert(schema.productImages).values({
    productId: row!.id,
    url: PLACEHOLDER,
    thumbUrl: PLACEHOLDER,
    alt: p.name,
    sortOrder: 0,
  });
  inserted++;
}

const existingHighlights = await db.select().from(schema.highlights);
if (existingHighlights.length === 0) {
  await db.insert(schema.highlights).values(
    seed.highlights.map((h) => ({
      title: h.title,
      subtitle: h.subtitle,
      ctaLabel: h.ctaLabel,
      ctaHref: h.ctaHref,
      imageUrl: PLACEHOLDER,
      sortOrder: h.sortOrder,
    })),
  );
}

await db
  .insert(schema.siteSettings)
  .values([
    {
      key: "contact",
      value: {
        email: "servicemanager@kolmesh.com",
        phone: "+233 54 794 6199",
        whatsapp: "+233547946199",
        address: "Accra, Ghana",
        hours: "Mon – Sat, 8:00 – 17:00",
      },
    },
    { key: "company", value: { name: "KOL Wire Mesh MFG Ltd", founded: 2010, tagline: "Engineered strength, made in Ghana." } },
  ])
  .onConflictDoNothing();

console.log(`✅ Seeded ${seed.categories.length} categories, ${inserted} new products, ${seed.highlights.length} highlights`);
await pool.end();
