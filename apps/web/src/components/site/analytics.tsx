"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Cookie-less, first-party page-view beacon. Nothing is sent to third parties. */
export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    if (!pathname) return;
    const body = JSON.stringify({ path: pathname, referrer: document.referrer || undefined });
    fetch("/api/v1/analytics/view", { method: "POST", keepalive: true, headers: { "content-type": "application/json", "x-requested-with": "kolmesh" }, body }).catch(() => {});
  }, [pathname]);
  return null;
}
