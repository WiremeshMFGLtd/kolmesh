import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Check, Phone } from "lucide-react";
import { getProduct, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/site/product-card";
import { Gallery } from "@/components/site/gallery";
import { ProductActions } from "@/components/site/product-actions";
import { Badge } from "@/components/ui/badge";
import { SITE_URL } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  const { items } = await getProducts({ limit: 100 });
  return items.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) return { title: "Product not found" };
  const img = p.images[0]?.url;
  return {
    title: p.name,
    description: p.shortDescription || p.description.slice(0, 160),
    openGraph: { title: p.name, description: p.shortDescription, images: img && img.startsWith("http") ? [img] : [] },
    alternates: { canonical: `${SITE_URL}/products/${p.slug}` },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.shortDescription || p.description,
    image: p.images.filter((i) => i.url.startsWith("http")).map((i) => i.url),
    brand: { "@type": "Brand", name: "KOL Wire Mesh MFG Ltd" },
    category: p.categoryName,
    offers: { "@type": "Offer", availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/PreOrder", priceCurrency: "GHS", ...(p.priceFrom ? { price: p.priceFrom } : {}) },
  };

  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-6 md:px-8 md:pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-steel-500">
        <Link href="/products" className="hover:text-ink">
          Products
        </Link>
        <ChevronRight size={14} />
        <Link href={`/products?category=${p.categorySlug}`} className="hover:text-ink">
          {p.categoryName}
        </Link>
        <ChevronRight size={14} />
        <span className="truncate text-ink">{p.name}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <Gallery images={p.images} name={p.name} />
        </div>

        <div className="lg:col-span-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="brand">{p.categoryName}</Badge>
            {p.inStock ? (
              <Badge tone="ok">
                <Check size={12} className="mr-1" /> In stock
              </Badge>
            ) : (
              <Badge>Made to order</Badge>
            )}
          </div>
          <h1 className="display mt-4 text-3xl md:text-[2.6rem]">{p.name}</h1>
          {p.shortDescription && <p className="mt-4 text-[16px] leading-relaxed text-steel-600">{p.shortDescription}</p>}

          {p.specs.length > 0 && (
            <dl className="mt-6 divide-y divide-steel-200 rounded-2xl border border-steel-200 bg-white">
              {p.specs.map((s, i) => {
                const [k, ...rest] = s.split(":");
                const v = rest.join(":").trim();
                return (
                  <div key={i} className="grid grid-cols-[120px_1fr] gap-4 px-5 py-3 text-[14.5px]">
                    <dt className="font-semibold text-steel-500">{v ? k : "Spec"}</dt>
                    <dd className="text-ink">{v || k}</dd>
                  </div>
                );
              })}
            </dl>
          )}

          <ProductActions product={p} />

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-steel-100 p-4 text-[14px] text-steel-700">
            <Phone size={18} className="shrink-0 text-brand-500" />
            <p>
              Need a large or custom order? Call{" "}
              <a href="tel:+233547946199" className="font-semibold text-ink">
                +233 54 794 6199
              </a>{" "}
              and speak with the production team directly.
            </p>
          </div>
        </div>
      </div>

      {p.description && (
        <section className="mt-16 grid gap-8 border-t border-steel-200 pt-12 md:grid-cols-12">
          <h2 className="text-xl font-bold md:col-span-4">About this product</h2>
          <div className="measure text-[16px] leading-relaxed text-steel-700 md:col-span-8">
            {p.description.split(/\n{2,}/).map((para, i) => (
              <p key={i} className={i > 0 ? "mt-4" : ""}>
                {para}
              </p>
            ))}
          </div>
        </section>
      )}

      {p.related && p.related.length > 0 && (
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <h2 className="display text-2xl md:text-3xl">More in {p.categoryName}</h2>
            <Link href={`/products?category=${p.categorySlug}`} className="text-[15px] font-semibold text-brand-600 hover:text-brand-700">
              View all
            </Link>
          </div>
          <div className="weld-grid mt-8 grid-cols-2 lg:grid-cols-4">
            {p.related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
