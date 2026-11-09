"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Trash2 } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { useQuote } from "@/lib/quote-store";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Turnstile } from "./turnstile";

export function QuoteForm() {
  const { lines, update, remove, clear } = useQuote();
  const startedAt = useRef(Date.now());
  const [token, setToken] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setErrors({});
    const fd = Object.fromEntries(new FormData(e.currentTarget).entries());
    try {
      const r = await api<{ reference: string }>("/quotes", {
        method: "POST",
        json: {
          ...fd,
          turnstileToken: token,
          startedAt: startedAt.current,
          items: lines.map((l) => ({ productId: l.productId, variant: l.variant, quantity: l.quantity, note: l.note })),
        },
      });
      setDone(r.reference);
      clear();
    } catch (x) {
      if (x instanceof ApiError) {
        setErr(x.message);
        if (x.details) setErrors(x.details);
      } else setErr("Could not send right now. Please try again or call us.");
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <div className="mt-10 max-w-xl rounded-3xl border border-ok/30 bg-ok/5 p-10">
        <CheckCircle2 className="text-ok" size={36} />
        <h2 className="mt-4 text-2xl font-bold">Request received</h2>
        <p className="mt-2 text-[15px] text-steel-700">
          Reference <strong>{done}</strong>. A confirmation has been emailed to you and our team will send the quote within one business day.
        </p>
        <Button href="/products" variant="dark" className="mt-6">
          Back to products
        </Button>
      </div>
    );

  if (!mounted) return <div className="mt-10 h-64 animate-pulse rounded-3xl bg-steel-100" />;

  if (lines.length === 0)
    return (
      <div className="mesh mesh-fade mt-10 rounded-3xl p-16 text-center">
        <h2 className="text-xl font-bold">Your quote list is empty</h2>
        <p className="mt-2 text-steel-600">Add products from the catalogue first — then come back here to send them.</p>
        <Button href="/products" variant="dark" className="mt-6">
          Browse products
        </Button>
      </div>
    );

  return (
    <form onSubmit={submit} noValidate className="mt-10 grid gap-10 lg:grid-cols-12">
      <section className="lg:col-span-7">
        <h2 className="text-lg font-bold">
          Items <span className="text-steel-400">{lines.length}</span>
        </h2>
        <ul className="mt-4 divide-y divide-steel-200 rounded-2xl border border-steel-200 bg-white">
          {lines.map((l) => (
            <li key={`${l.productId}-${l.variant}`} className="flex gap-4 p-4 md:p-5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-steel-100">
                <Image src={l.image} alt="" fill sizes="80px" className="object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${l.slug}`} className="font-semibold hover:text-brand-600">
                      {l.name}
                    </Link>
                    {l.variant && <p className="text-[13px] text-steel-500">{l.variant}</p>}
                  </div>
                  <button type="button" onClick={() => remove(l.productId, l.variant)} aria-label="Remove" className="rounded-md p-1.5 text-steel-400 hover:bg-danger/10 hover:text-danger">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[120px_1fr]">
                  <label className="block">
                    <span className="text-[12px] font-semibold text-steel-500">Quantity</span>
                    <Input type="number" min={1} value={l.quantity} onChange={(e) => update(l.productId, l.variant, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="mt-1 h-10" />
                  </label>
                  <label className="block">
                    <span className="text-[12px] font-semibold text-steel-500">Note for this item</span>
                    <Input value={l.note ?? ""} maxLength={300} onChange={(e) => update(l.productId, l.variant, { note: e.target.value })} placeholder="e.g. 3 m lengths, green" className="mt-1 h-10" />
                  </label>
                </div>
              </div>
            </li>
          ))}
        </ul>
        <Link href="/products" className="mt-4 inline-block text-[14px] font-semibold text-brand-600 hover:text-brand-700">
          Add more products
        </Link>
      </section>

      <section className="lg:col-span-5">
        <div className="rounded-3xl border border-steel-200 bg-white p-6 md:p-8">
          <h2 className="text-lg font-bold">Where should we send the quote?</h2>
          <div className="mt-6 space-y-4">
            <Field label="Your name" htmlFor="q-name" error={errors.name?.[0]}>
              <Input id="q-name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
            </Field>
            <Field label="Phone" htmlFor="q-phone" error={errors.phone?.[0]} hint="We may call to confirm specs">
              <Input id="q-phone" name="phone" type="tel" required minLength={6} maxLength={30} autoComplete="tel" />
            </Field>
            <Field label="Email" htmlFor="q-email" error={errors.email?.[0]}>
              <Input id="q-email" name="email" type="email" required maxLength={120} autoComplete="email" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company" hint="Optional" htmlFor="q-company">
                <Input id="q-company" name="company" maxLength={120} autoComplete="organization" />
              </Field>
              <Field label="Delivery location" hint="Town or region" htmlFor="q-location">
                <Input id="q-location" name="location" maxLength={120} />
              </Field>
            </div>
            <Field label="Anything else" hint="Optional" htmlFor="q-message">
              <Textarea id="q-message" name="message" maxLength={3000} className="min-h-24" placeholder="Timeline, site access, budget range…" />
            </Field>
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
              <label>
                Website <input name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>
            <Turnstile onToken={setToken} />
            {err && <p className="rounded-lg bg-danger/10 px-4 py-3 text-[14px] text-danger">{err}</p>}
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy ? "Sending…" : "Send quote request"}
            </Button>
            <p className="text-center text-[12.5px] text-steel-500">No account needed. We only use your details to respond to this request.</p>
          </div>
        </div>
      </section>
    </form>
  );
}
