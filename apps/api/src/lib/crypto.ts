import { createHash, createHmac, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from "node:crypto";
import { env } from "../config.js";

/** SHA-256 hex digest — used for refresh tokens so the DB never stores raw tokens. */
export const sha256 = (input: string) => createHash("sha256").update(input).digest("hex");

export const randomToken = (bytes = 48) => randomBytes(bytes).toString("base64url");

export const safeEqual = (a: string, b: string) => {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
};

/* AES-256-GCM for secrets at rest (TOTP seeds). Key derived from JWT_SECRET. */
const key = createHash("sha256").update(env.JWT_SECRET + ":totp").digest();

export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64url");
}

export function decrypt(payload: string): string {
  const buf = Buffer.from(payload, "base64url");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Daily-rotating, salted visitor hash for privacy-preserving analytics. */
export function visitorHash(ip: string, ua: string) {
  const day = new Date().toISOString().slice(0, 10);
  return createHmac("sha256", env.COOKIE_SECRET).update(`${day}|${ip}|${ua}`).digest("hex").slice(0, 32);
}
