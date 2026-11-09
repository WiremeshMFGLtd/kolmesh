"use client";
import Image from "next/image";
import { useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { upload, ApiError } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

export type Img = { id?: string; url: string; thumbUrl: string; storagePath?: string | null; width?: number | null; height?: number | null; alt?: string };

/**
 * Drag-and-drop uploader. Files go through the API (validated, re-encoded to WebP,
 * stored in Supabase Storage). Also accepts a pasted https URL (e.g. freeimage.host).
 */
export function ImageUploader({ images, onAdd, onRemove, onReorder, folder = "products", max = 12, single = false }: { images: Img[]; onAdd: (img: Img) => Promise<void> | void; onRemove: (img: Img, index: number) => Promise<void> | void; onReorder?: (next: Img[]) => void; folder?: "products" | "categories" | "highlights"; max?: number; single?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");
  const dragIdx = useRef<number | null>(null);
  const full = images.length >= (single ? 1 : max);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files).slice(0, (single ? 1 : max) - images.length);
    if (!list.length) return;
    setBusy(true);
    for (const f of list) {
      try {
        const r = await upload(f, folder);
        await onAdd({ ...r, alt: "" });
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : `Could not upload ${f.name}`);
      }
    }
    setBusy(false);
  }

  async function addUrl() {
    if (!/^https:\/\/.+/i.test(url)) return toast.error("Enter a full https:// image link");
    setBusy(true);
    try {
      await onAdd({ url: url.trim(), thumbUrl: url.trim(), storagePath: null, alt: "" });
      setUrl("");
      setUrlMode(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <ul className={single ? "grid grid-cols-1" : "grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6"}>
          {images.map((img, i) => (
            <li
              key={img.id ?? img.url}
              draggable={!!onReorder && !single}
              onDragStart={() => (dragIdx.current = i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (!onReorder || dragIdx.current === null || dragIdx.current === i) return;
                const next = [...images];
                const [moved] = next.splice(dragIdx.current, 1);
                next.splice(i, 0, moved!);
                onReorder(next);
                dragIdx.current = null;
              }}
              className={`group relative overflow-hidden rounded-xl border border-steel-200 bg-steel-100 ${single ? "aspect-[16/9]" : "aspect-square"}`}
            >
              <Image src={img.thumbUrl || img.url} alt="" fill sizes="200px" className="object-cover" unoptimized={!img.url.startsWith("http")} />
              {i === 0 && !single && <span className="absolute left-2 top-2 rounded-md bg-ink/80 px-1.5 py-0.5 text-[10px] font-bold text-white">Cover</span>}
              {onReorder && !single && <GripVertical size={16} className="absolute bottom-2 left-2 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />}
              <button type="button" onClick={() => onRemove(img, i)} className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-danger opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100" aria-label="Remove image">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {!full && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${drag ? "border-brand-400 bg-brand-50" : "border-steel-300 bg-steel-50"}`}
        >
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple={!single} hidden onChange={(e) => e.target.files && handleFiles(e.target.files)} />
          {busy ? (
            <div className="flex items-center justify-center gap-2 text-[14px] text-steel-600">
              <Loader2 size={16} className="animate-spin" /> Uploading and optimising…
            </div>
          ) : urlMode ? (
            <div className="mx-auto flex max-w-md gap-2">
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://iili.io/….jpg" className="h-10" />
              <Button size="sm" onClick={addUrl} className="h-10">
                Add
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setUrlMode(false)} className="h-10">
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <ImagePlus size={22} className="mx-auto text-steel-400" />
              <p className="mt-2 text-[14px] text-steel-700">
                Drag photos here, or{" "}
                <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold text-brand-600 hover:text-brand-700">
                  browse
                </button>
              </p>
              <p className="mt-1 text-[12px] text-steel-500">JPG, PNG or WebP up to 15 MB. Photos are compressed and converted automatically.</p>
              <button type="button" onClick={() => setUrlMode(true)} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-steel-500 hover:text-ink">
                <Link2 size={13} /> Paste an image link instead
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
