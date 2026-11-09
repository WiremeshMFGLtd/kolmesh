"use client";
import Image from "next/image";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { ProductImage } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const list = images.length ? images : [{ id: "ph", url: "/placeholder-product.svg", thumbUrl: "/placeholder-product.svg", alt: name } as ProductImage];
  const [i, setI] = useState(0);
  const cur = list[i] ?? list[0]!;
  return (
    <div className="flex flex-col gap-3 md:flex-row-reverse">
      <div className="relative aspect-square flex-1 overflow-hidden rounded-3xl bg-steel-100">
        <AnimatePresence mode="wait">
          <motion.div key={cur.id} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            <Image src={cur.url} alt={cur.alt || name} fill priority sizes="(max-width: 1024px) 100vw, 58vw" className="object-cover" />
          </motion.div>
        </AnimatePresence>
      </div>
      {list.length > 1 && (
        <ul className="thin-scroll flex gap-2 overflow-x-auto md:w-20 md:flex-col md:overflow-y-auto" aria-label="Product photos">
          {list.map((img, idx) => (
            <li key={img.id} className="shrink-0">
              <button onClick={() => setI(idx)} aria-label={`Photo ${idx + 1}`} aria-current={idx === i} className={cn("relative block h-20 w-20 overflow-hidden rounded-xl border-2 bg-steel-100 transition-colors", idx === i ? "border-brand-500" : "border-transparent hover:border-steel-300")}>
                <Image src={img.thumbUrl} alt="" fill sizes="80px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
