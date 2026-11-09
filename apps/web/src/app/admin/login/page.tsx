"use client";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { api, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") && sp.get("next")!.startsWith("/admin") ? sp.get("next")! : "/admin";
  const [stage, setStage] = useState<"password" | "mfa" | "checking">("checking");
  const [mfaToken, setMfaToken] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  // Silent refresh: if a valid refresh cookie exists, skip the form entirely.
  useEffect(() => {
    api("/auth/refresh", { method: "POST", retry: false })
      .then(() => router.replace(next))
      .catch(() => setStage("password"));
  }, [router, next]);

  useEffect(() => {
    if (stage === "mfa") codeRef.current?.focus();
  }, [stage]);

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const fd = new FormData(e.currentTarget);
    try {
      const r = await api<{ mfaRequired: boolean; mfaToken?: string }>("/auth/login", { method: "POST", json: { email: fd.get("email"), password: fd.get("password") } });
      if (r.mfaRequired && r.mfaToken) {
        setMfaToken(r.mfaToken);
        setStage("mfa");
      } else router.replace(next);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  async function onCode(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const code = String(new FormData(e.currentTarget).get("code") ?? "").replace(/\s/g, "");
    try {
      await api("/auth/login/verify", { method: "POST", json: { mfaToken, code } });
      router.replace(next);
    } catch (x) {
      setErr(x instanceof ApiError ? x.message : "Could not verify");
      if (x instanceof ApiError && x.status === 401 && /expired/i.test(x.message)) setStage("password");
    } finally {
      setBusy(false);
    }
  }

  if (stage === "checking") return <div className="h-72 animate-pulse rounded-2xl bg-steel-100" />;

  return (
    <div className="rounded-3xl border border-steel-200 bg-white p-8 shadow-lift">
      {stage === "password" ? (
        <form onSubmit={onPassword} className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold">Sign in</h1>
            <p className="mt-1 text-[14px] text-steel-500">Dashboard access is for KOL staff only.</p>
          </div>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" required autoComplete="username" autoFocus />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input id="password" name="password" type="password" required autoComplete="current-password" />
          </Field>
          {err && <p className="rounded-lg bg-danger/10 px-4 py-3 text-[14px] text-danger">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Checking…" : "Continue"}
          </Button>
        </form>
      ) : (
        <form onSubmit={onCode} className="space-y-5">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Two-factor code</h1>
              <p className="mt-1 text-[14px] text-steel-500">Open your authenticator app and enter the 6-digit code.</p>
            </div>
          </div>
          <Input ref={codeRef} name="code" inputMode="numeric" pattern="[0-9 ]*" maxLength={7} required placeholder="000 000" className="h-14 text-center text-2xl font-bold tracking-[0.4em]" autoComplete="one-time-code" />
          {err && <p className="rounded-lg bg-danger/10 px-4 py-3 text-[14px] text-danger">{err}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? "Verifying…" : "Sign in"}
          </Button>
          <button type="button" onClick={() => setStage("password")} className="w-full text-center text-[13px] font-semibold text-steel-500 hover:text-ink">
            Use a different account
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="mesh mesh-fade flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Image src="/logo.png" alt="KOL Wire Mesh" width={196} height={45} className="h-9 w-auto" priority />
          <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-steel-500">
            <KeyRound size={14} /> Admin
          </span>
        </div>
        <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-steel-100" />}>
          <LoginForm />
        </Suspense>
        <p className="mt-6 text-center text-[12.5px] text-steel-500">Sessions are protected with rate limiting, device-bound tokens and an audit trail.</p>
      </div>
    </div>
  );
}
