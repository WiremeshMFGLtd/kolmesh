import type { MetadataRoute } from "next";
import { getCategories, getProducts } from "@/lib/api";
import { SITE_URL } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ items }, cats] = await Promise.all([getProducts({ limit: 100 }), getCategories()]);
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contact`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/quote`, changeFrequency: "monthly", priority: 0.7 },
    ...cats.map((c) => ({ url: `${SITE_URL}/products?category=${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })),
    ...items.map((p) => ({ url: `${SITE_URL}/products/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "monthly" as const, priority: 0.8 })),
  ];
}
