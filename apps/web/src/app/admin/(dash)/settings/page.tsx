"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ShieldOff, LogOut } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { useApi } from "@/components/admin/use-api";
import { useAuth } from "@/components/admin/auth";
import { Card, PageHeader, Skeleton } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { fmtDateTime } from "@/lib/utils";

type Contact = { email: string; phone: string; whatsapp: string; address: string; hours: string };
type Session = { id: string; createdAt: string; expiresAt: string; ipAddress: string | null; userAgent: string | null };

function ContactSettings() {
  const { user } = useAuth();
  const { data, loading } = useApi<{ contact?: Contact }>("/admin/settings");
  const [f, setF] = useState<Contact>({ email: "", phone: "", whatsapp: "", address: "", hours: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data?.contact) setF(data.contact);
  }, [data]);
  const canEdit = user?.role !== "editor";

  async function save() {
    setBusy(true);
    try {
      await api("/admin/settings/contact", { method: "PUT", json: f });
      toast.success("Contact details saved");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  return (
    <Card title="Contact details on the website">
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Email">
          <Input value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} disabled={!canEdit} />
        </Field>
        <Field label="Phone, as displayed">
          <Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} disabled={!canEdit} />
        </Field>
        <Field label="WhatsApp number" hint="Digits with country code, e.g. +233547946199">
          <Input value={f.whatsapp} onChange={(e) => setF({ ...f, whatsapp: e.target.value })} disabled={!canEdit} />
        </Field>
        <Field label="Opening hours">
          <Input value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} disabled={!canEdit} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} disabled={!canEdit} />
        </Field>
        {canEdit && (
          <div className="sm:col-span-2">
            <Button onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save contact details"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function Password() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("newPassword") !== fd.get("confirm")) return toast.error("New passwords do not match");
    setBusy(true);
    try {
      await api("/auth/password", { method: "POST", json: { currentPassword: fd.get("currentPassword"), newPassword: fd.get("newPassword") } });
      toast.success("Password changed. Please sign in again.");
      router.replace("/admin/login");
    } catch (x) {
      toast.error(x instanceof ApiError ? x.message : "Could not change password");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card title="Password">
      <form onSubmit={submit} className="space-y-4 p-5">
        <Field label="Current password">
          <Input name="currentPassword" type="password" autoComplete="current-password" required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="New password" hint="12+ characters with upper, lower case and a number">
            <Input name="newPassword" type="password" autoComplete="new-password" minLength={12} required />
          </Field>
          <Field label="Confirm new password">
            <Input name="confirm" type="password" autoComplete="new-password" minLength={12} required />
          </Field>
        </div>
        <p className="text-[13px] text-steel-500">Changing your password signs out every other device.</p>
        <Button type="submit" variant="secondary" disabled={busy}>
          {busy ? "Updating…" : "Change password"}
        </Button>
      </form>
    </Card>
  );
}

function TwoFactor() {
  const { user, refresh } = useAuth();
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [disabling, setDisabling] = useState(false);

  async function start() {
    setBusy(true);
    try {
      setSetup(await api<{ qr: string; secret: string }>("/auth/totp/setup", { method: "POST" }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not start setup");
    } finally {
      setBusy(false);
    }
  }
  async function confirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/totp/confirm", { method: "POST", json: { code: String(new FormData(e.currentTarget).get("code")).replace(/\s/g, "") } });
      toast.success("Two-factor authentication is on");
      setSetup(null);
      await refresh();
    } catch (x) {
      toast.error(x instanceof ApiError ? x.message : "Incorrect code");
    } finally {
      setBusy(false);
    }
  }
  async function disable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await api("/auth/totp/disable", { method: "POST", json: { password: fd.get("password"), code: String(fd.get("code")).replace(/\s/g, "") } });
      toast.success("Two-factor authentication turned off");
      setDisabling(false);
      await refresh();
    } catch (x) {
      toast.error(x instanceof ApiError ? x.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Two-factor authentication" action={user?.totpEnabled ? <Badge tone="ok">On</Badge> : <Badge tone="warn">Off</Badge>}>
      <div className="p-5">
        {user?.totpEnabled ? (
          <>
            <p className="flex items-start gap-3 text-[14px] text-steel-700">
              <ShieldCheck size={20} className="shrink-0 text-ok" /> Your account asks for a code from your authenticator app at every sign-in.
            </p>
            {!disabling ? (
              <Button variant="ghost" size="sm" className="mt-4" onClick={() => setDisabling(true)}>
                Turn off
              </Button>
            ) : (
              <form onSubmit={disable} className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                <Input name="password" type="password" placeholder="Your password" required autoComplete="current-password" />
                <Input name="code" inputMode="numeric" placeholder="6-digit code" required />
                <Button type="submit" variant="danger" disabled={busy}>
                  Confirm
                </Button>
              </form>
            )}
          </>
        ) : setup ? (
          <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
            <Image src={setup.qr} alt="QR code for authenticator app" width={220} height={220} unoptimized className="rounded-xl border border-steel-200" />
            <form onSubmit={confirm} className="space-y-3">
              <p className="text-[14px] text-steel-700">Scan this with Google Authenticator, Microsoft Authenticator, Authy or 1Password, then enter the code it shows.</p>
              <p className="break-all rounded-lg bg-steel-50 px-3 py-2 font-mono text-[12px] text-steel-600">Manual key: {setup.secret}</p>
              <div className="flex gap-2">
                <Input name="code" inputMode="numeric" placeholder="000 000" required maxLength={7} className="w-40 text-center text-lg font-bold tracking-widest" autoFocus />
                <Button type="submit" disabled={busy}>
                  Activate
                </Button>
                <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          <>
            <p className="flex items-start gap-3 text-[14px] text-steel-700">
              <ShieldOff size={20} className="shrink-0 text-warn" /> Add a second step at sign-in so a leaked password alone cannot open the dashboard. Strongly recommended for every account.
            </p>
            <Button className="mt-4" onClick={start} disabled={busy}>
              Set up 2FA
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function Sessions() {
  const { data, reload } = useApi<Session[]>("/auth/sessions");
  const router = useRouter();
  async function revokeAll() {
    if (!confirm("Sign out of every device, including this one?")) return;
    await api("/auth/sessions/revoke-all", { method: "POST" });
    router.replace("/admin/login");
  }
  return (
    <Card
      title="Active sessions"
      action={
        <Button size="sm" variant="ghost" onClick={revokeAll}>
          <LogOut size={14} /> Sign out everywhere
        </Button>
      }
    >
      <ul className="divide-y divide-steel-200 text-[13.5px]">
        {data?.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{s.userAgent?.replace(/\).*$/, ")") ?? "Unknown device"}</p>
              <p className="text-[12.5px] text-steel-500">
                {s.ipAddress ?? "—"} · signed in {fmtDateTime(s.createdAt)}
              </p>
            </div>
          </li>
        ))}
        {data && data.length === 0 && <li className="px-5 py-4 text-steel-500">No active sessions.</li>}
      </ul>
      <button onClick={reload} className="sr-only">
        refresh
      </button>
    </Card>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <>
      <PageHeader title="Settings" description={`Signed in as ${user?.email}`} />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          <ContactSettings />
          <Password />
        </div>
        <div className="space-y-5" id="security">
          <TwoFactor />
          <Sessions />
        </div>
      </div>
    </>
  );
}
