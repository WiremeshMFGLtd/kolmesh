"use client";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { Product } from "@/lib/types";
import { AddToQuote } from "./add-to-quote";
import { cn } from "@/lib/utils";

export function ProductActions({ product }: { product: Product }) {
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [qty, setQty] = useState(1);
  const variant = product.variants.map((v) => choice[v.label]).filter(Boolean).join(" / ") || undefined;
  const complete = product.variants.every((v) => choice[v.label]);

  return (
    <div className="mt-6 space-y-5">
      {product.variants.map((v) => (
        <fieldset key={v.label}>
          <legend className="text-[13px] font-semibold text-steel-700">{v.label}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {v.options.map((o) => {
              const on = choice[v.label] === o;
              return (
                <button key={o} type="button" onClick={() => setChoice((c) => ({ ...c, [v.label]: o }))} aria-pressed={on} className={cn("h-10 rounded-[10px] border px-3.5 text-[14px] font-semibold transition-colors", on ? "border-ink bg-ink text-white" : "border-steel-200 bg-white hover:border-steel-400")}>
                  {o}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex h-12 items-center rounded-[10px] border border-steel-200 bg-white">
          <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="px-3 text-steel-600 hover:text-ink">
            <Minus size={16} />
          </button>
          <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} aria-label="Quantity" className="w-14 border-x border-steel-200 py-2 text-center font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
          <button aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)} className="px-3 text-steel-600 hover:text-ink">
            <Plus size={16} />
          </button>
        </div>
        <AddToQuote product={product} variant={variant} quantity={qty} size="lg" className="flex-1" />
      </div>
      {!complete && product.variants.length > 0 && <p className="text-[13px] text-steel-500">Choose {product.variants.map((v) => v.label.toLowerCase()).join(" and ")} so we can quote the right item — or add it as is and tell us in the message.</p>}
    </div>
  );
}
