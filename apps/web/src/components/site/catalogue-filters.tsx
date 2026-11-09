"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { Category } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CatalogueFilters({ categories, activeSlug, q, total }: { categories: Category[]; activeSlug?: string; q?: string; total: number }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(q ?? "");
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");
      router.replace(`/products${next.toString() ? `?${next}` : ""}`, { scroll: false });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const chip = (href: string, label: string, count: number | undefined, active: boolean) => (
    <Link
      key={href}
      href={href}
      scroll={false}
      className={cn("inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors", active ? "border-ink bg-ink text-white" : "border-steel-200 bg-white text-steel-700 hover:border-steel-400")}
    >
      {label}
      {count !== undefined && <span className={cn("text-[12px]", active ? "text-white/60" : "text-steel-400")}>{count}</span>}
    </Link>
  );

  return (
    <div className="sticky top-18 z-30 -mx-5 mt-8 border-y border-steel-200 bg-steel-50/90 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="thin-scroll flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1 lg:pb-0 [mask-image:linear-gradient(to_right,black_92%,transparent)]">
          {chip(q ? `/products?q=${encodeURIComponent(q)}` : "/products", "All", categories.reduce((n, c) => n + c.productCount, 0), !activeSlug)}
          {categories.map((c) => chip(`/products?category=${c.slug}${q ? `&q=${encodeURIComponent(q)}` : ""}`, c.name, c.productCount, c.slug === activeSlug))}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="hidden whitespace-nowrap text-[13px] text-steel-500 sm:block">{total} shown</p>
          <label className="relative block w-full lg:w-72">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400" />
            <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Search products" aria-label="Search products" className="h-10 w-full rounded-full border border-steel-200 bg-white pl-10 pr-9 text-[14px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10" />
            {value && (
              <button onClick={() => setValue("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-steel-400 hover:bg-steel-100 hover:text-ink">
                <X size={14} />
              </button>
            )}
          </label>
        </div>
      </div>
    </div>
  );
}
