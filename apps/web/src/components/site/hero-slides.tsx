"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Highlight } from "@/lib/types";

/**
 * Hero image panel. Cycles through admin-managed highlights; pauses on hover
 * and respects reduced-motion. Falls back to the mesh texture if there are
 * no slides with real images yet.
 */
export function HeroSlides({ slides }: { slides: Highlight[] }) {
  const real = slides.filter((s) => s.imageUrl && !s.imageUrl.endsWith(".svg"));
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (real.length < 2 || paused || reduce) return;
    const t = setInterval(() => setI((v) => (v + 1) % real.length), 5500);
    return () => clearInterval(t);
  }, [real.length, paused, reduce]);

  const cur = real[i];

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-steel-200 md:aspect-[5/4] lg:aspect-[4/3]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      {cur ? (
        <>
          <AnimatePresence mode="sync">
            <motion.div key={cur.id} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}>
              <Image src={cur.imageUrl} alt={cur.title} fill priority sizes="(max-width: 768px) 100vw, 58vw" className="object-cover" />
            </motion.div>
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
            <AnimatePresence mode="wait">
              <motion.div key={cur.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.5 }}>
                <p className="text-[13px] font-medium text-white/75">{cur.subtitle}</p>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-2xl font-bold text-white md:text-3xl">{cur.title}</h2>
                  <Link href={cur.ctaHref} className="inline-flex h-10 items-center rounded-[10px] bg-white px-4 text-sm font-semibold text-ink hover:bg-steel-100">
                    {cur.ctaLabel}
                  </Link>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          {real.length > 1 && (
            <div className="absolute right-5 top-5 flex gap-1.5" role="tablist" aria-label="Slides">
              {real.map((s, idx) => (
                <button key={s.id} role="tab" aria-selected={idx === i} aria-label={`Slide ${idx + 1}`} onClick={() => setI(idx)} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-7 bg-white" : "w-3 bg-white/50 hover:bg-white/80"}`} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="mesh absolute inset-0 flex items-end bg-steel-100 p-8">
          <div>
            <p className="text-[13px] font-medium text-steel-500">Hero images are managed in the dashboard</p>
            <p className="mt-1 text-xl font-bold text-steel-700">Upload your first highlight to replace this panel</p>
          </div>
        </div>
      )}
    </div>
  );
}
