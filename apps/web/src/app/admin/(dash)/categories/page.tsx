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
import { Field, Input, Switch, Textarea } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import type { Category } from "@/lib/types";

type Form = { name: string; description: string; imageUrl: string | null; sortOrder: number; isActive: boolean };
const empty: Form = { name: "", description: "", imageUrl: null, sortOrder: 0, isActive: true };

export default function CategoriesPage() {
  const { data, loading, reload } = useApi<Category[]>("/admin/categories");
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [f, setF] = useState<Form>(empty);
  const [busy, setBusy] = useState(false);

  function open(c: Category | "new") {
    setEditing(c);
    setF(c === "new" ? empty : { name: c.name, description: c.description, imageUrl: c.imageUrl, sortOrder: c.sortOrder, isActive: c.isActive ?? true });
  }

  async function save() {
    setBusy(true);
    try {
      if (editing === "new") await api("/admin/categories", { method: "POST", json: f });
      else if (editing) await api(`/admin/categories/${editing.id}`, { method: "PUT", json: f });
      toast.success(editing === "new" ? "Category created" : "Category saved");
      setEditing(null);
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove(c: Category) {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try {
      await api(`/admin/categories/${c.id}`, { method: "DELETE" });
      toast.success("Category deleted");
      void reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete");
    }
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Product families shown on the homepage and catalogue filters."
        actions={
          <Button onClick={() => open("new")}>
            <Plus size={16} /> New category
          </Button>
        }
      />
      {loading ? (
        <Skeleton className="h-64" />
      ) : !data?.length ? (
        <Card>
          <Empty title="No categories yet" />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="relative aspect-[16/9] bg-steel-100">
                {c.imageUrl ? <Image src={c.imageUrl} alt="" fill sizes="400px" className="object-cover" /> : <div className="mesh absolute inset-0" />}
                {!c.isActive && (
                  <Badge className="absolute left-3 top-3 bg-white/90">Hidden</Badge>
                )}
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[16px] font-bold">{c.name}</h2>
                    <p className="text-[12.5px] text-steel-500">
                      /{c.slug} · {c.productCount} product{c.productCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => open(c)}>
                    <Pencil size={14} /> Edit
                  </Button>
                </div>
                <p className="mt-3 line-clamp-2 text-[13.5px] text-steel-600">{c.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "New category" : "Edit category"}>
        <div className="space-y-4 p-6">
          <Field label="Name">
            <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Description" hint="Shown under the category name">
            <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} maxLength={600} className="min-h-24" />
          </Field>
          <Field label="Cover photo" hint="Landscape works best">
            <ImageUploader single folder="categories" images={f.imageUrl ? [{ url: f.imageUrl, thumbUrl: f.imageUrl }] : []} onAdd={(img) => setF({ ...f, imageUrl: img.url })} onRemove={() => setF({ ...f, imageUrl: null })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sort order">
              <Input type="number" min={0} value={f.sortOrder} onChange={(e) => setF({ ...f, sortOrder: Number(e.target.value) || 0 })} />
            </Field>
          </div>
          <Switch checked={f.isActive} onChange={(v) => setF({ ...f, isActive: v })} label="Visible on website" />
          <div className="flex items-center justify-between pt-2">
            {editing && editing !== "new" ? (
              <Button variant="danger" size="sm" onClick={() => remove(editing)}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button onClick={save} disabled={busy || !f.name}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
