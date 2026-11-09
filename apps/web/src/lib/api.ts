/**
 * Server-side data access (React Server Components).
 * Talks directly to the API origin and tags responses so the API can
 * purge the cache the moment content changes in the dashboard.
 */
import "server-only";
import type { Category, Highlight, Product, Settings } from "./types";

const API_URL = process.env.API_URL ?? "http://localhost:8080";

async function get<T>(path: string, tags: string[], fallback: T): Promise<T> {
  try {
    const res = await fetch(`${API_URL}/v1${path}`, { next: { revalidate: 300, tags }, headers: { accept: "application/json" } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const getCategories = () => get<Category[]>("/categories", ["categories"], []);
export const getHighlights = () => get<Highlight[]>("/highlights", ["highlights"], []);
export const getSettings = () => get<Settings>("/settings", ["settings"], {});

export const getProducts = (params: { category?: string; q?: string; featured?: boolean; limit?: number } = {}) => {
  const sp = new URLSearchParams();
  if (params.category) sp.set("category", params.category);
  if (params.q) sp.set("q", params.q);
  if (params.featured) sp.set("featured", "true");
  if (params.limit) sp.set("limit", String(params.limit));
  const qs = sp.toString();
  return get<{ items: Product[]; total: number }>(`/products${qs ? `?${qs}` : ""}`, ["products"], { items: [], total: 0 });
};

export const getProduct = (slug: string) => get<Product | null>(`/products/${encodeURIComponent(slug)}`, ["products", `product:${slug}`], null);
