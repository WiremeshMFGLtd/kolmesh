import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Factory, ShieldCheck, Truck, MessageSquareQuote, Ruler, PackageCheck } from "lucide-react";
import { getCategories, getHighlights, getProducts } from "@/lib/api";
import { ProductCard } from "@/components/site/product-card";
import { Button } from "@/components/ui/button";
import { HeroSlides } from "@/components/site/hero-slides";

export const revalidate = 300;

export default async function HomePage() {
  const [categories, highlights, featured] = await Promise.all([getCategories(), getHighlights(), getProducts({ featured: true, limit: 8 })]);
  const products = featured.items.length >= 4 ? featured.items : (await getProducts({ limit: 8 })).items;
  const totalProducts = categories.reduce((n, c) => n + c.productCount, 0);

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative -mt-18 overflow-hidden pt-18">
        <div className="mesh mesh-fade pointer-events-none absolute inset-0 -z-10" aria-hidden />
        <div className="mx-auto grid max-w-[1280px] items-center gap-10 px-5 pb-16 pt-10 md:grid-cols-12 md:px-8 md:pb-24 md:pt-16 lg:gap-16">
          <div className="md:col-span-6">
            <p className="rise text-[15px] font-semibold text-brand-600">Manufactured in Ghana since 2010</p>
            <h1 className="display rise d1 mt-4 text-[clamp(2.5rem,5vw,4.25rem)]">
              Wire mesh and hardware built to hold.
            </h1>
            <p className="rise d2 measure mt-6 text-[17px] leading-relaxed text-steel-600">
              Galvanised and PVC-coated mesh, fencing panels, barbed wire, nails and site hardware — produced at our own plant and supplied to contractors, retailers and developers across West Africa.
            </p>
            <div className="rise d3 mt-8 flex flex-wrap gap-3">
              <Button href="/products" size="lg">
                Browse the catalogue
              </Button>
              <Button href="/quote" size="lg" variant="secondary">
                Request a quote
              </Button>
            </div>
            <dl className="rise d4 mt-12 grid grid-cols-3 gap-6 border-t border-steel-200 pt-6">
              {[
                [String(totalProducts || 40), "products"],
                ["15+", "years in production"],
                ["1 day", "quote turnaround"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="text-2xl font-bold tracking-tight md:text-3xl">{v}</dd>
                  <dd className="mt-0.5 text-[13px] text-steel-500">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="unveil md:col-span-6">
            <HeroSlides slides={highlights} />
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────── */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-3xl md:text-4xl">What we make</h2>
            <p className="measure mt-3 text-[16px] text-steel-600">Six product families, one plant. Pick a family to see sizes, gauges and finishes.</p>
          </div>
          <Link href="/products" className="inline-flex items-center gap-1 text-[15px] font-semibold text-brand-600 hover:text-brand-700">
            All products <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="weld-grid mt-10 grid-cols-2 md:grid-cols-3">
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="group relative flex min-h-56 flex-col justify-end overflow-hidden p-5 md:min-h-72 md:p-7">
              {c.imageUrl ? (
                <>
                  <Image src={c.imageUrl} alt="" fill sizes="(max-width:768px) 50vw, 33vw" className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/20 to-transparent" />
                </>
              ) : (
                <div className="mesh absolute inset-0 opacity-70 transition-opacity group-hover:opacity-100" />
              )}
              <div className="relative">
                <p className={c.imageUrl ? "text-[13px] font-medium text-white/80" : "text-[13px] font-medium text-steel-500"}>
                  {c.productCount} product{c.productCount === 1 ? "" : "s"}
                </p>
                <h3 className={`mt-1 text-xl font-bold md:text-2xl ${c.imageUrl ? "text-white" : "text-ink"}`}>{c.name}</h3>
                <p className={`mt-2 line-clamp-2 text-[14px] leading-relaxed ${c.imageUrl ? "text-white/85" : "text-steel-600"}`}>{c.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured products ────────────────────────────── */}
      <section className="border-y border-steel-200 bg-white">
        <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="display text-3xl md:text-4xl">Most requested</h2>
              <p className="measure mt-3 text-[16px] text-steel-600">The products contractors order again and again. Add any to your quote list as you go.</p>
            </div>
          </div>
          <div className="weld-grid mt-10 grid-cols-2 lg:grid-cols-4">
            {products.slice(0, 8).map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 4} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why KOL ──────────────────────────────────────── */}
      <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-24">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <h2 className="display text-3xl md:text-4xl">Made here, not imported in a container.</h2>
            <p className="measure mt-5 text-[16px] leading-relaxed text-steel-600">
              Because we manufacture locally, you get consistent gauges, custom lengths, and stock that is actually available when your site needs it. No waiting on shipping schedules.
            </p>
            <Button href="/about" variant="secondary" className="mt-8">
              About the company
            </Button>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-2xl border border-steel-200 bg-steel-200 sm:grid-cols-2 md:col-span-7">
            {[
              { icon: Factory, t: "Own production line", d: "Welded mesh, PVC coating, wire drawing and nail making all happen under our roof in Ghana." },
              { icon: ShieldCheck, t: "Galvanised for the coast", d: "Hot-dip and electro-galvanised finishes specified for humid, salty West African conditions." },
              { icon: Ruler, t: "Cut to your spec", d: "Custom roll lengths, panel sizes and gauges for fencing, reinforcement and enclosures." },
              { icon: Truck, t: "Delivery nationwide", d: "Dispatch from Accra to every region, plus export to neighbouring countries." },
            ].map(({ icon: Icon, t, d }) => (
              <li key={t} className="bg-white p-6 md:p-8">
                <Icon size={24} className="text-brand-500" strokeWidth={1.75} />
                <h3 className="mt-4 text-[17px] font-bold">{t}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-steel-600">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How ordering works (a real sequence → numbered) ─ */}
      <section className="bg-ink text-white">
        <div className="mesh-dark mx-auto max-w-[1280px] px-5 py-16 md:px-8 md:py-24">
          <h2 className="display text-3xl md:text-4xl">From quote to site in three steps</h2>
          <ol className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: MessageSquareQuote, t: "Send your list", d: "Add products to your quote list, tell us quantities and where the job is. Takes two minutes." },
              { icon: Ruler, t: "We confirm specs and price", d: "Within one business day you get a quote with gauges, finishes, lead time and delivery cost." },
              { icon: PackageCheck, t: "Collect or we deliver", d: "Pick up from our yard or have it delivered to site. Bulk and recurring orders welcome." },
            ].map(({ icon: Icon, t, d }, i) => (
              <li key={t} className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-7 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <Icon size={26} strokeWidth={1.75} className="text-brand-300" />
                  <span className="text-sm font-bold text-white/40">{i + 1} / 3</span>
                </div>
                <h3 className="mt-6 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-white/70">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <Button href="/quote" size="lg" className="bg-white text-ink hover:bg-steel-100 active:bg-steel-200">
              Start a quote request
            </Button>
            <a href="tel:+233547946199" className="text-[15px] font-medium text-white/80 hover:text-white">
              or call +233 54 794 6199
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
