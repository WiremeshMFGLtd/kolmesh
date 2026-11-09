import { env } from "../config.js";

/** Tells the Next.js app to purge its cached pages after content changes. */
export async function revalidateWeb(tags: string[]) {
  if (!env.REVALIDATE_SECRET) return;
  try {
    await fetch(`${env.WEB_URL}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-revalidate-secret": env.REVALIDATE_SECRET },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* non-fatal */
  }
}
