"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, FolderTree, Images, Inbox, Settings, Users, ScrollText, LogOut, Menu, X, ExternalLink, ShieldAlert } from "lucide-react";
import { useAuth } from "./auth";
import { useApi } from "./use-api";
import { cn } from "@/lib/utils";
import type { Dashboard } from "@/lib/types";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, badge: true },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/highlights", label: "Hero slides", icon: Images },
  { href: "/admin/settings", label: "Settings", icon: Settings },
  { href: "/admin/team", label: "Team", icon: Users, roles: ["owner"] },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, roles: ["owner", "admin"] },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data } = useApi<Dashboard>(user ? "/admin/dashboard" : null);
  useEffect(() => setOpen(false), [pathname]);

  if (loading || !user) return <div className="flex min-h-dvh items-center justify-center text-sm text-steel-500">Loading dashboard…</div>;

  const unread = data?.enquiries.unread ?? 0;
  const needs2fa = !user.totpEnabled && pathname !== "/admin/settings";

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center justify-between px-5">
        <Link href="/admin" className="flex items-center">
          <Image src="/logo.png" alt="KOL" width={160} height={37} className="h-8 w-auto" />
        </Link>
        <button className="rounded-md p-1.5 text-steel-500 hover:bg-steel-100 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-2" aria-label="Dashboard">
        {nav
          .filter((n) => !n.roles || n.roles.includes(user.role))
          .map(({ href, label, icon: Icon, exact, badge }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn("group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition-colors", active ? "bg-ink text-white" : "text-steel-700 hover:bg-steel-100 hover:text-ink")}>
                <Icon size={18} strokeWidth={1.9} className={active ? "text-brand-300" : "text-steel-500 group-hover:text-ink"} />
                <span className="flex-1">{label}</span>
                {badge && unread > 0 && <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", active ? "bg-brand-500 text-white" : "bg-brand-500 text-white")}>{unread}</span>}
              </Link>
            );
          })}
      </nav>
      <div className="border-t border-steel-200 p-3">
        <Link href="/" target="_blank" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium text-steel-700 hover:bg-steel-100">
          <ExternalLink size={18} strokeWidth={1.9} className="text-steel-500" /> View website
        </Link>
        <div className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-500 text-sm font-bold text-white">{user.name.slice(0, 1).toUpperCase()}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-semibold">{user.name}</p>
            <p className="truncate text-[12px] capitalize text-steel-500">{user.role}</p>
          </div>
          <button onClick={logout} className="rounded-md p-2 text-steel-500 hover:bg-steel-100 hover:text-ink" aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-steel-50 lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden border-r border-steel-200 bg-white lg:sticky lg:top-0 lg:block lg:h-dvh">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-white shadow-pop">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-steel-200 bg-white/80 px-4 backdrop-blur-md lg:hidden">
          <button onClick={() => setOpen(true)} className="rounded-md p-2 hover:bg-steel-100" aria-label="Open menu">
            <Menu size={20} />
          </button>
          <Image src="/logo.png" alt="KOL" width={140} height={32} className="h-7 w-auto" />
        </header>
        {needs2fa && (
          <div className="flex items-center gap-3 border-b border-warn/30 bg-warn/10 px-6 py-2.5 text-[13.5px] text-steel-800">
            <ShieldAlert size={16} className="text-warn" />
            <span className="flex-1">Two-factor authentication is off for your account.</span>
            <Link href="/admin/settings#security" className="font-semibold text-ink underline-offset-2 hover:underline">
              Turn it on
            </Link>
          </div>
        )}
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
