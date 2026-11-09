"use client";
import { useState } from "react";
import { Plus, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { useApi } from "@/components/admin/use-api";
import { useAuth } from "@/components/admin/auth";
import { Card, PageHeader, Skeleton } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

type Member = { id: string; email: string; name: string; role: "owner" | "admin" | "editor"; totpEnabled: boolean; isActive: boolean; lastLoginAt: string | null; createdAt: string };

export default function TeamPage() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi<Member[]>("/admin/team");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ name: "", email: "", role: "editor" });

  async function invite() {
    setBusy(true);
    try {
      await api("/admin/team", { method: "POST", json: f });
      toast.success("Invitation sent by email");
      setOpen(false);
      setF({ name: "", email: "", role: "editor" });
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not invite");
    } finally {
      setBusy(false);
    }
  }
  async function patch(m: Member, body: Partial<Pick<Member, "role" | "isActive">>) {
    try {
      await api(`/admin/team/${m.id}`, { method: "PATCH", json: body });
      toast.success("Updated");
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not update");
    }
  }

  if (user?.role !== "owner") return <p className="text-steel-600">Only the account owner can manage the team.</p>;

  return (
    <>
      <PageHeader
        title="Team"
        description="Who can sign in to this dashboard. Editors manage content; admins can also delete and see the audit log."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus size={16} /> Invite
          </Button>
        }
      />
      <Card>
        {loading ? (
          <Skeleton className="m-4 h-40" />
        ) : (
          <table className="w-full text-left text-[14px]">
            <thead className="text-[12px] text-steel-500">
              <tr className="border-b border-steel-200">
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">2FA</th>
                <th className="px-5 py-3 font-semibold">Last sign-in</th>
                <th className="px-5 py-3 font-semibold">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-200">
              {data?.map((m) => (
                <tr key={m.id}>
                  <td className="px-5 py-3">
                    <p className="font-semibold">
                      {m.name} {m.id === user.id && <span className="text-steel-400">(you)</span>}
                    </p>
                    <p className="text-[12.5px] text-steel-500">{m.email}</p>
                  </td>
                  <td className="px-5 py-3">
                    {m.role === "owner" || m.id === user.id ? (
                      <Badge tone="dark">Owner</Badge>
                    ) : (
                      <Select value={m.role} onChange={(e) => patch(m, { role: e.target.value as "admin" | "editor" })} className="h-9 w-32 text-[13px]">
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                      </Select>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {m.totpEnabled ? (
                      <span className="inline-flex items-center gap-1 text-ok">
                        <ShieldCheck size={15} /> On
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-warn">
                        <ShieldOff size={15} /> Off
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-steel-600">{m.lastLoginAt ? timeAgo(m.lastLoginAt) : "Never"}</td>
                  <td className="px-5 py-3">
                    {m.role === "owner" ? (
                      <Badge tone="ok">Active</Badge>
                    ) : (
                      <Button size="sm" variant={m.isActive ? "secondary" : "primary"} onClick={() => patch(m, { isActive: !m.isActive })}>
                        {m.isActive ? "Suspend" : "Reactivate"}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} title="Invite a team member">
        <div className="space-y-4 p-6">
          <Field label="Full name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          </Field>
          <Field label="Work email" hint="They receive a temporary password and must set up 2FA">
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label="Role">
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
              <option value="editor">Editor — manage products, slides, enquiries</option>
              <option value="admin">Admin — editor plus delete and audit log</option>
            </Select>
          </Field>
          <Button onClick={invite} disabled={busy || !f.name || !f.email} className="w-full">
            {busy ? "Sending…" : "Send invitation"}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
