"use client";
import { useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Turnstile } from "./turnstile";

export function ContactForm() {
  const startedAt = useRef(Date.now());
  const [token, setToken] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setErrors({});
    const fd = new FormData(e.currentTarget);
    try {
      const r = await api<{ reference: string }>("/contact", {
        method: "POST",
        json: { ...Object.fromEntries(fd.entries()), turnstileToken: token, startedAt: startedAt.current },
      });
      setDone(r.reference);
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
      <div className="rounded-2xl border border-ok/30 bg-ok/5 p-8">
        <CheckCircle2 className="text-ok" size={32} />
        <h3 className="mt-4 text-xl font-bold">Message sent</h3>
        <p className="mt-2 text-[15px] text-steel-700">
          Your reference is <strong>{done}</strong>. We reply within one business day — usually faster.
        </p>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" error={errors.name?.[0]}>
          <Input id="name" name="name" required minLength={2} maxLength={80} autoComplete="name" />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.[0]}>
          <Input id="email" name="email" type="email" required maxLength={120} autoComplete="email" />
        </Field>
        <Field label="Phone" hint="Optional" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" maxLength={30} autoComplete="tel" />
        </Field>
        <Field label="Company" hint="Optional" htmlFor="company">
          <Input id="company" name="company" maxLength={120} autoComplete="organization" />
        </Field>
      </div>
      <Field label="Message" htmlFor="message" error={errors.message?.[0]}>
        <Textarea id="message" name="message" required minLength={10} maxLength={3000} placeholder="Tell us about the job, quantities, and timing." />
      </Field>
      {/* Honeypot — hidden from humans, irresistible to bots */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <Turnstile onToken={setToken} />
      {err && <p className="rounded-lg bg-danger/10 px-4 py-3 text-[14px] text-danger">{err}</p>}
      <Button type="submit" size="lg" disabled={busy} className="w-full sm:w-auto">
        {busy ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
