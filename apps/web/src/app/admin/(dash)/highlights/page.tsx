"use client";
import Image from "next/image";
import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { useApi } from "@/components/admin/use-api";
import { Card, Empty, PageHeader, Skeleton } from "@/components/admin/page-header";
import { ImageUploader } from "@/components/admin/image-uploader";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Switch } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Highlight } from "@/lib/types";

type Form = { title: string; subtitle: string; ctaLabel: string; ctaHref: string; imageUrl: string; storagePath: string | null; sortOrder: number; isActive: boolean };
const empty: Form = { title: "", subtitle: "", ctaLabel: "Browse products", ctaHref: "/products", imageUrl: "", storagePath: null, sortOrder: 0, isActive: true };

export default function HighlightsPage() {
  const { data, loading, reload } = useApi<Highlight[]>("/admin/highlights");
  const [editing, setEditing] = useState<Highlight | "new" | null>(null);
  const [f, setF] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);

  function open(h: Highlight | "new") {
    setEditing(h);
    setF(h === "new" ? empty : { title: h.title, subtitle: h.subtitle, ctaLabel: h.ctaLabel, ctaHref: h.ctaHref, imageUrl: h.imageUrl.startsWith("http") ? h.imageUrl : "", storagePath: h.storagePath, sortOrder: h.sortOrder, isActive: h.isActive });
  }
  async function save() {
    if (!f.imageUrl) return toast.error("Add a photo first");
    setBusy(true);
    try {
      if (editing === "new") await api("/admin/highlights", { method: "POST", json: f });
      else if (editing) await api(`/admin/highlights/${editing.id}`, { method: "PUT", json: f });
      toast.success("Slide saved");
      setEditing(null);
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }
  async function remove(h: Highlight) {
    if (!confirm(`Delete "${h.title}"?`)) return;
    await api(`/admin/highlights/${h.id}`, { method: "DELETE" });
    toast.success("Slide deleted");
    setEditing(null);
    void reload();
  }

  return (
    <>
      <PageHeader
        title="Hero slides"
        description="Large photos on the homepage. Use wide, well-lit shots of products or the factory."
        actions={
          <Button onClick={() => open("new")}>
            <Plus size={16} /> New slide
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : !data?.length ? (
        <Card>
          <Empty title="No slides yet" hint="The homepage shows a placeholder panel until you add one." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((h) => (
            <Card key={h.id} className="overflow-hidden">
              <div className="relative aspect-[16/10] bg-steel-100">
                {h.imageUrl.startsWith("http") ? <Image src={h.imageUrl} alt="" fill sizes="400px" className="object-cover" /> : <div className="mesh absolute inset-0 flex items-center justify-center text-[13px] text-steel-500">No photo yet</div>}
                <div className="absolute left-3 top-3 flex gap-1.5">
                  {!h.isActive && <Badge className="bg-white/90">Hidden</Badge>}
                  <Badge className="bg-white/90">#{h.sortOrder}</Badge>
                </div>
              </div>
              <div className="flex items-start justify-between gap-3 p-5">
                <div>
                  <p className="text-[12.5px] text-steel-500">{h.subtitle}</p>
                  <h2 className="text-[16px] font-bold">{h.title}</h2>
                  <p className="mt-1 text-[12.5px] text-steel-500">
                    Button “{h.ctaLabel}” → {h.ctaHref}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => open(h)}>
                  <Pencil size={14} /> Edit
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New slide" : "Edit slide"}>
        <div className="space-y-4 p-6">
          <Field label="Photo" hint="Landscape, at least 1600 px wide">
            <ImageUploader single folder="highlights" images={f.imageUrl ? [{ url: f.imageUrl, thumbUrl: f.imageUrl }] : []} onAdd={(img) => setF({ ...f, imageUrl: img.url, storagePath: img.storagePath ?? null })} onRemove={() => setF({ ...f, imageUrl: "", storagePath: null })} />
          </Field>
          <Field label="Headline">
            <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={100} placeholder="Galvanised wire rolls" />
          </Field>
          <Field label="Small line above the headline">
            <Input value={f.subtitle} onChange={(e) => setF({ ...f, subtitle: e.target.value })} maxLength={200} placeholder="Quality and durability" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button text">
              <Input value={f.ctaLabel} onChange={(e) => setF({ ...f, ctaLabel: e.target.value })} maxLength={40} />
            </Field>
            <Field label="Button link" hint="Relative, e.g. /products?category=wire-mesh">
              <Input value={f.ctaHref} onChange={(e) => setF({ ...f, ctaHref: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Order">
              <Input type="number" min={0} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <Switch checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="Show on homepage" />
          <div className="flex items-center justify-between pt-2">
            {editing && editing !== "new" ? (
              <Button variant="danger" size="sm" onClick={() => remove(editing)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={busy || !f.title}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
