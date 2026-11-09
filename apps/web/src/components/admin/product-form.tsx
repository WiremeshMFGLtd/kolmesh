"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { useApi } from "./use-api";
import { useAuth } from "./auth";
import { ImageUploader, type Img } from "./image-uploader";
import { Card } from "./page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/field";
import type { Category, Product, Variant } from "@/lib/types";

type Form = {
  name: string;
  slug: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  specs: string[];
  variants: Variant[];
  priceFrom: string;
  unit: string;
  inStock: boolean;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

export function ProductForm({ product }: { product?: Product & { category?: Category } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: cats } = useApi<Category[]>("/admin/categories");
  const [f, setF] = useState<Form>({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    categoryId: product?.categoryId ?? "",
    shortDescription: product?.shortDescription ?? "",
    description: product?.description ?? "",
    specs: product?.specs ?? [],
    variants: product?.variants ?? [],
    priceFrom: product?.priceFrom != null ? String(product.priceFrom) : "",
    unit: product?.unit ?? "per unit",
    inStock: product?.inStock ?? true,
    isFeatured: product?.isFeatured ?? false,
    isActive: product?.isActive ?? true,
    sortOrder: product?.sortOrder ?? 0,
  });
  const [images, setImages] = useState<Img[]>(product?.images ?? []);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [slugTouched, setSlugTouched] = useState(!!product);

  useEffect(() => {
    if (!slugTouched) setF((s) => ({ ...s, slug: slugify(s.name) }));
  }, [f.name, slugTouched]);

  useEffect(() => {
    if (!f.categoryId && cats?.[0]) setF((s) => ({ ...s, categoryId: cats[0]!.id }));
  }, [cats, f.categoryId]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));

  async function save() {
    setBusy(true);
    setErrors({});
    const payload = {
      ...f,
      slug: f.slug || undefined,
      specs: f.specs.map((s) => s.trim()).filter(Boolean),
      variants: f.variants.map((v) => ({ label: v.label.trim(), options: v.options.map((o) => o.trim()).filter(Boolean) })).filter((v) => v.label && v.options.length),
      priceFrom: f.priceFrom === "" ? null : Number(f.priceFrom),
    };
    try {
      if (product) {
        await api(`/admin/products/${product.id}`, { method: "PUT", json: payload });
        toast.success("Product saved");
        router.refresh();
      } else {
        const created = await api<Product>("/admin/products", { method: "POST", json: payload });
        toast.success("Product created — now add photos");
        router.replace(`/admin/products/${created.id}`);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        toast.error(e.message);
        if (e.details) setErrors(e.details);
      } else toast.error("Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!product || !confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    try {
      await api(`/admin/products/${product.id}`, { method: "DELETE" });
      toast.success("Product deleted");
      router.replace("/admin/products");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not delete");
    }
  }

  async function addImage(img: Img) {
    if (!product) return;
    const row = await api<Img>(`/admin/products/${product.id}/images`, { method: "POST", json: { url: img.url, thumbUrl: img.thumbUrl, storagePath: img.storagePath, width: img.width, height: img.height, alt: f.name } });
    setImages((s) => [...s.filter((i) => i.url !== "/placeholder-product.svg"), row]);
  }
  async function removeImage(img: Img) {
    if (!product || !img.id) return;
    await api(`/admin/products/${product.id}/images/${img.id}`, { method: "DELETE" });
    setImages((s) => s.filter((i) => i.id !== img.id));
  }
  async function reorder(next: Img[]) {
    if (!product) return;
    setImages(next);
    await api(`/admin/products/${product.id}/images/order`, { method: "PUT", json: next.map((i) => i.id) });
  }

  const canDelete = user?.role === "owner" || user?.role === "admin";

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <div className="space-y-5 xl:col-span-2">
        <Card title="Details">
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" error={errors.name?.[0]} className="sm:col-span-2">
                <Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={120} placeholder="e.g. Flat Welded Mesh (Galvanised)" />
              </Field>
              <Field label="URL slug" hint={`kolmesh.com/products/${f.slug || "…"}`} error={errors.slug?.[0]}>
                <Input
                  value={f.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", slugify(e.target.value));
                  }}
                />
              </Field>
              <Field label="Category" error={errors.categoryId?.[0]}>
                <Select value={f.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                  {cats?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Short description" hint="One sentence shown on cards and search results" error={errors.shortDescription?.[0]}>
              <Input value={f.shortDescription} onChange={(e) => set("shortDescription", e.target.value)} maxLength={300} />
            </Field>
            <Field label="Full description" hint="Blank line between paragraphs" error={errors.description?.[0]}>
              <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} className="min-h-40" />
            </Field>
          </div>
        </Card>

        <Card title="Photos">
          <div className="p-5">
            {product ? (
              <ImageUploader images={images.filter((i) => i.url.startsWith("http"))} onAdd={addImage} onRemove={removeImage} onReorder={reorder} />
            ) : (
              <p className="rounded-xl bg-steel-50 p-4 text-[14px] text-steel-600">Save the product first, then upload photos here. The first photo becomes the cover.</p>
            )}
          </div>
        </Card>

        <Card title="Specifications" action={<span className="text-[12.5px] text-steel-500">Shown as a table on the product page</span>}>
          <div className="space-y-2 p-5">
            {f.specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input value={s} onChange={(e) => set("specs", f.specs.map((x, j) => (j === i ? e.target.value : x)))} placeholder="Size: 2.5 mm, 3 mm" maxLength={200} />
                <Button variant="ghost" size="sm" className="h-11 px-3" onClick={() => set("specs", f.specs.filter((_, j) => j !== i))} aria-label="Remove spec">
                  <Trash2 size={16} />
                </Button>
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => set("specs", [...f.specs, ""])} disabled={f.specs.length >= 30}>
              <Plus size={14} /> Add specification
            </Button>
          </div>
        </Card>

        <Card title="Options customers choose" action={<span className="text-[12.5px] text-steel-500">e.g. Colour, Gauge, Height</span>}>
          <div className="space-y-4 p-5">
            {f.variants.map((v, i) => (
              <div key={i} className="rounded-xl border border-steel-200 p-4">
                <div className="flex gap-2">
                  <Input value={v.label} onChange={(e) => set("variants", f.variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} placeholder="Option name, e.g. Colour" maxLength={60} className="font-semibold" />
                  <Button variant="ghost" size="sm" className="h-11 px-3" onClick={() => set("variants", f.variants.filter((_, j) => j !== i))} aria-label="Remove option">
                    <Trash2 size={16} />
                  </Button>
                </div>
                <Input
                  value={v.options.join(", ")}
                  onChange={(e) => set("variants", f.variants.map((x, j) => (j === i ? { ...x, options: e.target.value.split(",").map((o) => o.trimStart()) } : x)))}
                  placeholder="Choices separated by commas: Green, Blue, Galvanised"
                  className="mt-2"
                />
              </div>
            ))}
            <Button variant="secondary" size="sm" onClick={() => set("variants", [...f.variants, { label: "", options: [] }])} disabled={f.variants.length >= 10}>
              <Plus size={14} /> Add option group
            </Button>
          </div>
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Visibility">
          <div className="space-y-3 p-5">
            <Switch checked={f.isActive} onChange={(v) => set("isActive", v)} label="Visible on website" description="Hidden products stay in the dashboard" />
            <Switch checked={f.isFeatured} onChange={(v) => set("isFeatured", v)} label="Featured" description="Shown in “Most requested” on the homepage" />
            <Switch checked={f.inStock} onChange={(v) => set("inStock", v)} label="In stock" description="Off shows “Made to order”" />
            <Field label="Sort order" hint="Lower numbers appear first">
              <Input type="number" min={0} value={f.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value) || 0)} />
            </Field>
          </div>
        </Card>
        <Card title="Pricing (optional)">
          <div className="grid grid-cols-2 gap-3 p-5">
            <Field label="From, GHS" hint="Leave blank for quote-only">
              <Input type="number" min={0} value={f.priceFrom} onChange={(e) => set("priceFrom", e.target.value)} placeholder="—" />
            </Field>
            <Field label="Unit">
              <Input value={f.unit} onChange={(e) => set("unit", e.target.value)} maxLength={40} placeholder="per roll" />
            </Field>
          </div>
        </Card>
        <div className="sticky top-6 space-y-2">
          <Button size="lg" className="w-full" onClick={save} disabled={busy || !f.name || !f.categoryId}>
            {busy ? "Saving…" : product ? "Save changes" : "Create product"}
          </Button>
          {product && (
            <>
              <Button href={`/products/${product.slug}`} target="_blank" variant="secondary" className="w-full">
                <ExternalLink size={15} /> View on website
              </Button>
              {canDelete && (
                <Button variant="danger" className="w-full" onClick={remove}>
                  Delete product
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
