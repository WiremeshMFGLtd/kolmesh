"use client";
import { Turnstile as CfTurnstile } from "@marsidev/react-turnstile";

const KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/** Cloudflare Turnstile — invisible for most humans, server-verified. Renders nothing when not configured (dev). */
export function Turnstile({ onToken }: { onToken: (t: string | undefined) => void }) {
  if (!KEY) return null;
  return <CfTurnstile siteKey={KEY} onSuccess={onToken} onExpire={() => onToken(undefined)} onError={() => onToken(undefined)} options={{ theme: "light", size: "flexible" }} />;
}
