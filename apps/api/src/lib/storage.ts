import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { env } from "../config.js";

const client =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
    : null;

export const storageEnabled = () => client !== null;

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type StoredImage = { url: string; thumbUrl: string; storagePath: string; width: number; height: number };

/**
 * Validates, re-encodes (strips metadata / neutralises polyglot payloads),
 * resizes to web-friendly WebP derivatives and uploads to Supabase Storage.
 */
export async function processAndUpload(buffer: Buffer, mimeHint: string, folder: "products" | "categories" | "highlights"): Promise<StoredImage> {
  if (!client) throw new Error("Storage is not configured");
  if (!ALLOWED.has(mimeHint)) throw new Error("Unsupported image type");
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new Error("Image too large (max 15 MB)");

  // sharp re-reads the actual bytes, so a renamed non-image fails here.
  const base = sharp(buffer, { failOn: "error", limitInputPixels: 50_000_000 }).rotate();
  const meta = await base.metadata();
  if (!meta.width || !meta.height) throw new Error("Could not read image");

  const id = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
  const large = await base.clone().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 560, height: 560, fit: "inside", withoutEnlargement: true }).webp({ quality: 78 }).toBuffer();

  const largePath = `${folder}/${id}.webp`;
  const thumbPath = `${folder}/${id}-thumb.webp`;

  const [l, t] = await Promise.all([
    client.storage.from(env.SUPABASE_BUCKET).upload(largePath, large.data, { contentType: "image/webp", cacheControl: "31536000", upsert: false }),
    client.storage.from(env.SUPABASE_BUCKET).upload(thumbPath, thumb, { contentType: "image/webp", cacheControl: "31536000", upsert: false }),
  ]);
  if (l.error) throw new Error(l.error.message);
  if (t.error) throw new Error(t.error.message);

  const pub = (p: string) => client!.storage.from(env.SUPABASE_BUCKET).getPublicUrl(p).data.publicUrl;
  return { url: pub(largePath), thumbUrl: pub(thumbPath), storagePath: largePath, width: large.info.width, height: large.info.height };
}

export async function deleteStored(storagePath: string | null | undefined) {
  if (!client || !storagePath) return;
  const thumb = storagePath.replace(/\.webp$/, "-thumb.webp");
  await client.storage.from(env.SUPABASE_BUCKET).remove([storagePath, thumb]);
}
