import type { Metadata } from "next";
import { getCategories } from "@/lib/api";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "About", description: "KOL Wire Mesh MFG Ltd — manufacturing wire mesh, nails and hardware in Ghana since 2010." };

export default async function AboutPage() {
  const categories = await getCategories();
  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-8 md:px-8 md:pt-12">
      <div className="grid gap-10 md:grid-cols-12">
        <div className="md:col-span-7">
          <h1 className="display text-4xl md:text-[3.4rem]">Fifteen years of drawing wire in Ghana.</h1>
        </div>
        <div className="md:col-span-5 md:pt-3">
          <p className="text-[17px] leading-relaxed text-steel-600">
            Incorporated in 2010, Wire Mesh Manufacturing Ltd (KOL) produces and supplies wire mesh, nails, louvre glass and metal hardware from our plant in Ghana. Our brand is trusted by builders across Ghana and neighbouring countries.
          </p>
        </div>
      </div>

      <div className="mesh mesh-fade mt-14 rounded-3xl p-1 md:mt-20">
        <div className="grid gap-px overflow-hidden rounded-[22px] border border-steel-200 bg-steel-200 md:grid-cols-3">
          {[
            { t: "Our story", d: "We started with welded mesh for perimeter fencing and grew into a full range of fencing, fasteners and site hardware. Every line we added came from a customer asking for something they couldn't get locally at consistent quality." },
            { t: "Our mission", d: "Become essential to our customers by providing differentiated products and service that help them finish projects on time. It starts with the product, and it keeps going." },
            { t: "Why customers stay", d: "Innovation, integrity, credibility and openness. Competitive pricing, dependable quality, and a team that picks up the phone — that is why our brand has earned its place on sites across the region." },
          ].map((b) => (
            <div key={b.t} className="bg-white p-8 md:p-10">
              <h2 className="text-xl font-bold">{b.t}</h2>
              <p className="mt-3 text-[15.5px] leading-relaxed text-steel-600">{b.d}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-20 grid gap-10 md:grid-cols-12">
        <div className="md:col-span-5">
          <h2 className="display text-3xl md:text-4xl">What leaves the factory</h2>
          <p className="measure mt-4 text-[16px] text-steel-600">Six product families, all manufactured or finished in-house and quality-checked before dispatch.</p>
          <Button href="/products" className="mt-8">
            Open the catalogue
          </Button>
        </div>
        <ul className="divide-y divide-steel-200 rounded-2xl border border-steel-200 bg-white md:col-span-7">
          {categories.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-6 px-6 py-5">
              <div>
                <h3 className="text-[16px] font-bold">{c.name}</h3>
                <p className="mt-1 text-[14px] text-steel-600">{c.description}</p>
              </div>
              <span className="shrink-0 text-[13px] font-semibold text-steel-500">{c.productCount} items</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
