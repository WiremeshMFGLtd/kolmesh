"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import type { AdminUser } from "@/lib/types";

type Ctx = { user: AdminUser | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void> };
const AuthCtx = createContext<Ctx>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: AdminUser }>("/auth/me");
      setUser(r.user);
    } catch {
      setUser(null);
      router.replace("/admin/login");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    router.replace("/admin/login");
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Keep the short-lived access token fresh while the dashboard is open.
  useEffect(() => {
    const t = setInterval(() => api("/auth/refresh", { method: "POST", retry: false }).catch(() => {}), 12 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  return <AuthCtx.Provider value={{ user, loading, refresh, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
