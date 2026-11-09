import type { Metadata } from "next";
import { Suspense } from "react";
import { getCategories, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/site/product-card";
import { CatalogueFilters } from "@/components/site/catalogue-filters";
import { Button } from "@/components/ui/button";

export const revalidate = 300;

type Search = { category?: string; q?: string };

export async function generateMetadata({ searchParams }: { searchParams: Promise<Search> }): Promise<Metadata> {
  const sp = await searchParams;
  const cats = await getCategories();
  const cat = cats.find((c) => c.slug === sp.category);
  return {
    title: cat ? `${cat.name}` : "Products",
    description: cat?.description ?? "Browse galvanised and PVC-coated wire mesh, fencing, nails, louvre glass and building hardware manufactured by KOL Wire Mesh in Ghana.",
  };
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const q = sp.q?.slice(0, 80);
  const [categories, result] = await Promise.all([getCategories(), getProducts({ category: sp.category, q, limit: 100 })]);
  const active = categories.find((c) => c.slug === sp.category);

  return (
    <div className="mx-auto max-w-[1280px] px-5 pb-8 pt-8 md:px-8 md:pt-12">
      <div className="max-w-2xl">
        <h1 className="display text-4xl md:text-5xl">{active ? active.name : "Products"}</h1>
        <p className="measure mt-4 text-[16px] leading-relaxed text-steel-600">
          {active?.description ?? "Everything we manufacture and stock, in one place. Filter by family, search by name, and add anything to your quote list."}
        </p>
      </div>

      <Suspense>
        <CatalogueFilters categories={categories} activeSlug={sp.category} q={q} total={result.total} />
      </Suspense>

      {result.items.length === 0 ? (
        <div className="mesh mesh-fade mt-10 rounded-3xl p-16 text-center">
          <h2 className="text-xl font-bold">No products match</h2>
          <p className="mt-2 text-steel-600">Try another search term or clear the filters.</p>
          <Button href="/products" variant="dark" className="mt-6">
            Show all products
          </Button>
        </div>
      ) : (
        <div className="weld-grid mt-8 grid-cols-2 lg:grid-cols-4">
          {result.items.map((p, i) => (
            <ProductCard key={p.id} product={p} priority={i < 8} />
          ))}
        </div>
      )}
    </div>
  );
}
