/**
 * Browser-side fetch wrapper. All requests go to the same-origin /api proxy,
 * carry the anti-CSRF header the API requires, and transparently refresh an
 * expired admin session once before giving up.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include", headers: { "x-requested-with": "kolmesh" } })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => setTimeout(() => (refreshing = null), 0));
  }
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown; retry?: boolean } = {}): Promise<T> {
  const { json, retry = true, ...rest } = init;
  const res = await fetch(`/api/v1${path}`, {
    ...rest,
    credentials: "include",
    headers: {
      accept: "application/json",
      "x-requested-with": "kolmesh",
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (res.status === 401 && retry && !path.startsWith("/auth/login") && !path.startsWith("/auth/refresh")) {
    if (await tryRefresh()) return api<T>(path, { ...init, retry: false });
  }

  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; details?: Record<string, string[]> };
  if (!res.ok) throw new ApiError(res.status, data.error ?? data.message ?? "Request failed", data.details);
  return data as T;
}

export async function upload(file: File, folder: "products" | "categories" | "highlights" = "products") {
  const fd = new FormData();
  fd.append("folder", folder);
  fd.append("file", file);
  return api<{ url: string; thumbUrl: string; storagePath: string; width: number; height: number }>("/admin/uploads", { method: "POST", body: fd });
}
