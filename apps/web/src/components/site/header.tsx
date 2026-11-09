"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ClipboardList, Menu, Phone, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Category } from "@/lib/types";
import { useQuote } from "@/lib/quote-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/products", label: "Products" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function Header({ categories }: { categories: Category[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const lines = useQuote((s) => s.lines);
  const setOpen = useQuote((s) => s.setOpen);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setMenu(false), [pathname]);

  const count = mounted ? lines.reduce((n, l) => n + l.quantity, 0) : 0;

  return (
    <header className={cn("sticky top-0 z-40 transition-[background-color,box-shadow,border-color] duration-300", scrolled ? "bg-white/85 backdrop-blur-md border-b border-steel-200" : "bg-transparent border-b border-transparent")}>
      <div className="mx-auto flex h-18 max-w-[1280px] items-center justify-between px-5 md:px-8">
        <Link href="/" className="flex items-center" aria-label="KOL Wire Mesh — home">
          <Image src="/logo.png" alt="KOL Wire Mesh MFG Ltd" width={196} height={45} priority className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link key={l.href} href={l.href} className={cn("relative rounded-md px-3.5 py-2 text-[15px] font-medium transition-colors", active ? "text-ink" : "text-steel-600 hover:text-ink")}>
                {l.label}
                {active && <span className="absolute inset-x-3.5 -bottom-[1px] h-0.5 rounded-full bg-brand-500" />}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <a href="tel:+233547946199" className="hidden items-center gap-2 rounded-md px-3 py-2 text-[14px] font-medium text-steel-700 hover:text-ink lg:flex">
            <Phone size={16} className="text-brand-500" /> +233 54 794 6199
          </a>
          <Button variant="dark" size="sm" onClick={() => setOpen(true)} className="relative" aria-label="Open quote list">
            <ClipboardList size={16} />
            <span className="hidden sm:inline">Quote list</span>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1 text-[11px] font-bold text-white ring-2 ring-white">
                {count}
              </span>
            )}
          </Button>
          <button onClick={() => setMenu((v) => !v)} className="rounded-md p-2 text-steel-700 hover:bg-steel-100 md:hidden" aria-label="Toggle menu" aria-expanded={menu}>
            {menu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-steel-200 bg-white md:hidden">
            <div className="space-y-1 px-5 py-4">
              {links.map((l) => (
                <Link key={l.href} href={l.href} className="block rounded-md px-3 py-2.5 text-base font-medium hover:bg-steel-50">
                  {l.label}
                </Link>
              ))}
              <div className="mt-3 border-t border-steel-200 pt-3">
                <p className="px-3 pb-1 text-[13px] font-semibold text-steel-500">Browse by category</p>
                {categories.map((c) => (
                  <Link key={c.id} href={`/products?category=${c.slug}`} className="block rounded-md px-3 py-2 text-[15px] text-steel-700 hover:bg-steel-50">
                    {c.name} <span className="text-steel-400">{c.productCount}</span>
                  </Link>
                ))}
              </div>
              <a href="tel:+233547946199" className="mt-2 flex items-center gap-2 px-3 py-2 text-[15px] font-medium">
                <Phone size={16} className="text-brand-500" /> +233 54 794 6199
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
