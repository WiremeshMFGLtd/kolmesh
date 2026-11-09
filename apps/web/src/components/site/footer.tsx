import Link from "next/link";
import Image from "next/image";
import { Mail, MapPin, Phone, Clock, MessageCircle } from "lucide-react";
import type { Category, Settings } from "@/lib/types";

export function Footer({ categories, settings }: { categories: Category[]; settings: Settings }) {
  const c = settings.contact ?? { email: "servicemanager@kolmesh.com", phone: "+233 54 794 6199", whatsapp: "+233547946199", address: "Accra, Ghana", hours: "Mon – Sat, 8:00 – 17:00" };
  return (
    <footer className="mt-24 border-t border-steel-200 bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-5 py-16 md:grid-cols-12 md:px-8">
        <div className="md:col-span-5">
          <Image src="/logo.png" alt="KOL Wire Mesh MFG Ltd" width={196} height={45} className="h-10 w-auto" />
          <p className="measure mt-5 text-[15px] leading-relaxed text-steel-600">
            Manufacturing wire mesh, fencing, nails and building hardware in Ghana since 2010. Supplying contractors, hardware retailers and developers across Ghana and West Africa.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#25D366]/10 px-4 text-sm font-semibold text-[#128C7E] hover:bg-[#25D366]/20">
              <MessageCircle size={16} /> WhatsApp us
            </a>
            <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-steel-100 px-4 text-sm font-semibold text-ink hover:bg-steel-200">
              <Phone size={16} /> {c.phone}
            </a>
          </div>
        </div>

        <div className="md:col-span-3">
          <h3 className="text-sm font-bold">Products</h3>
          <ul className="mt-4 space-y-2.5 text-[15px] text-steel-600">
            {categories.map((cat) => (
              <li key={cat.id}>
                <Link href={`/products?category=${cat.slug}`} className="hover:text-ink">
                  {cat.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/products" className="font-semibold text-brand-600 hover:text-brand-700">
                All products
              </Link>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h3 className="text-sm font-bold">Visit or call</h3>
          <ul className="mt-4 space-y-3 text-[15px] text-steel-600">
            <li className="flex gap-3">
              <MapPin size={18} className="mt-0.5 shrink-0 text-brand-500" /> {c.address}
            </li>
            <li className="flex gap-3">
              <Clock size={18} className="mt-0.5 shrink-0 text-brand-500" /> {c.hours}
            </li>
            <li className="flex gap-3">
              <Mail size={18} className="mt-0.5 shrink-0 text-brand-500" />
              <a href={`mailto:${c.email}`} className="hover:text-ink">
                {c.email}
              </a>
            </li>
          </ul>
          <div className="mt-6 flex gap-4 text-[15px]">
            <Link href="/about" className="text-steel-600 hover:text-ink">
              About
            </Link>
            <Link href="/contact" className="text-steel-600 hover:text-ink">
              Contact
            </Link>
            <Link href="/quote" className="text-steel-600 hover:text-ink">
              Request a quote
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-steel-200">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-5 text-[13px] text-steel-500 sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>© {new Date().getFullYear()} KOL Wire Mesh MFG Ltd. All rights reserved.</p>
          <p>Incorporated in Ghana, 2010.</p>
        </div>
      </div>
    </footer>
  );
}
