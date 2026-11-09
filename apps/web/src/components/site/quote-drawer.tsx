"use client";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ClipboardList } from "lucide-react";
import { useQuote } from "@/lib/quote-store";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function QuoteDrawer() {
  const { lines, open, setOpen, update, remove } = useQuote();
  return (
    <Dialog open={open} onClose={() => setOpen(false)} title="Your quote list" side>
      {lines.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center px-8 text-center">
          <div className="mesh mesh-fade flex h-28 w-28 items-center justify-center rounded-full">
            <ClipboardList size={36} className="text-brand-500" />
          </div>
          <h3 className="mt-6 text-lg font-bold">Nothing here yet</h3>
          <p className="mt-2 text-[15px] text-steel-600">Add products from the catalogue and send them to us in one request. We reply with a quote within one business day.</p>
          <Button href="/products" variant="dark" className="mt-6" onClick={() => setOpen(false)}>
            Browse products
          </Button>
        </div>
      ) : (
        <div className="flex h-full flex-col">
          <ul className="flex-1 divide-y divide-steel-200 px-6">
            {lines.map((l) => (
              <li key={`${l.productId}-${l.variant}`} className="flex gap-4 py-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-steel-100">
                  <Image src={l.image} alt="" fill sizes="80px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${l.slug}`} onClick={() => setOpen(false)} className="line-clamp-2 text-[15px] font-semibold hover:text-brand-600">
                    {l.name}
                  </Link>
                  {l.variant && <p className="mt-0.5 text-[13px] text-steel-500">{l.variant}</p>}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="inline-flex items-center rounded-lg border border-steel-200">
                      <button aria-label="Decrease" onClick={() => update(l.productId, l.variant, { quantity: Math.max(1, l.quantity - 1) })} className="p-1.5 text-steel-600 hover:text-ink">
                        <Minus size={14} />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={l.quantity}
                        onChange={(e) => update(l.productId, l.variant, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-12 border-x border-steel-200 py-1 text-center text-sm font-semibold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Quantity"
                      />
                      <button aria-label="Increase" onClick={() => update(l.productId, l.variant, { quantity: l.quantity + 1 })} className="p-1.5 text-steel-600 hover:text-ink">
                        <Plus size={14} />
                      </button>
                    </div>
                    <button onClick={() => remove(l.productId, l.variant)} className="rounded-md p-1.5 text-steel-400 hover:bg-danger/10 hover:text-danger" aria-label="Remove">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-steel-200 bg-steel-50 p-6">
            <p className="text-[13px] text-steel-600">
              {lines.length} product{lines.length === 1 ? "" : "s"}. Prices depend on quantity and delivery location — we confirm everything in the quote.
            </p>
            <Button href="/quote" size="lg" className="mt-4 w-full" onClick={() => setOpen(false)}>
              Request a quote
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
