import type { Metadata } from "next";
import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { getSettings } from "@/lib/api";
import { ContactForm } from "@/components/site/contact-form";

export const metadata: Metadata = { title: "Contact", description: "Call, WhatsApp or message KOL Wire Mesh MFG Ltd in Ghana. We reply within one business day." };

export default async function ContactPage() {
  const s = await getSettings();
  const c = s.contact ?? { email: "servicemanager@kolmesh.com", phone: "+233 54 794 6199", whatsapp: "+233547946199", address: "Accra, Ghana", hours: "Mon – Sat, 8:00 – 17:00" };
  const rows = [
    { icon: Phone, label: "Call", value: c.phone, href: `tel:${c.phone.replace(/\s/g, "")}` },
    { icon: MessageCircle, label: "WhatsApp", value: c.phone, href: `https://wa.me/${c.whatsapp.replace(/\D/g, "")}` },
    { icon: Mail, label: "Email", value: c.email, href: `mailto:${c.email}` },
    { icon: MapPin, label: "Yard", value: c.address },
    { icon: Clock, label: "Hours", value: c.hours },
  ];
  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-8 md:px-8 md:pt-12">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-20">
        <div className="lg:col-span-5">
          <h1 className="display text-4xl md:text-5xl">Talk to the people who make it.</h1>
          <p className="measure mt-5 text-[16px] leading-relaxed text-steel-600">For quick questions, call or WhatsApp. For quotes with several items, use the quote list — it gets to the right person faster.</p>
          <ul className="mt-10 divide-y divide-steel-200 rounded-2xl border border-steel-200 bg-white">
            {rows.map(({ icon: Icon, label, value, href }) => (
              <li key={label} className="flex items-center gap-4 px-5 py-4">
                <Icon size={20} className="shrink-0 text-brand-500" strokeWidth={1.75} />
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-steel-500">{label}</p>
                  {href ? (
                    <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="block truncate text-[15px] font-semibold hover:text-brand-600">
                      {value}
                    </a>
                  ) : (
                    <p className="text-[15px] font-semibold">{value}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-steel-200 bg-white p-6 md:p-10">
            <h2 className="text-xl font-bold">Send a message</h2>
            <p className="mt-1 text-[14px] text-steel-500">Replies within one business day.</p>
            <div className="relative mt-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
