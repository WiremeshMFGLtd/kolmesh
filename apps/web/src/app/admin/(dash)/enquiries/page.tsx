"use client";
import Link from "next/link";
import { useState } from "react";
import { Search } from "lucide-react";
import { useApi } from "@/components/admin/use-api";
import { Card, Empty, PageHeader, Skeleton } from "@/components/admin/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import type { Enquiry } from "@/lib/types";
import { STATUS_LABEL, timeAgo, cn } from "@/lib/utils";

export default function EnquiriesPage() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const sp = new URLSearchParams();
  if (status) sp.set("status", status);
  if (type) sp.set("type", type);
  if (debounced) sp.set("q", debounced);
  const { data, loading } = useApi<{ items: Enquiry[]; total: number }>(`/admin/enquiries?${sp}`);

  return (
    <>
      <PageHeader title="Enquiries" description={data ? `${data.total} total` : undefined} />
      <Card>
        <div className="flex flex-col gap-3 border-b border-steel-200 p-4 md:flex-row">
          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                clearTimeout((window as unknown as { _t?: number })._t);
                (window as unknown as { _t?: number })._t = window.setTimeout(() => setDebounced(e.target.value.trim()), 350);
              }}
              placeholder="Search name, email, company or reference"
              className="h-10 w-full rounded-[10px] border border-steel-200 pl-10 pr-3 text-[14px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
            />
          </label>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="h-10 md:w-44">
            <option value="">Quotes and messages</option>
            <option value="quote">Quote requests</option>
            <option value="contact">Messages</option>
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 md:w-44">
            <option value="">Any status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        {loading && !data ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : !data?.items.length ? (
          <Empty title="Nothing here" hint="Quote requests and messages from the website land in this inbox." />
        ) : (
          <ul className="divide-y divide-steel-200">
            {data.items.map((e) => (
              <li key={e.id}>
                <Link href={`/admin/enquiries/${e.id}`} className={cn("flex items-start gap-4 px-5 py-4 hover:bg-steel-50", !e.isRead && "bg-brand-50/40")}>
                  <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", e.isRead ? "bg-transparent" : "bg-brand-500")} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className={cn("text-[14.5px]", e.isRead ? "font-medium" : "font-bold")}>{e.name}</p>
                      {e.company && <p className="text-[13px] text-steel-500">{e.company}</p>}
                      <span className="text-[12px] text-steel-400">{e.reference}</span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[13.5px] text-steel-600">{e.type === "quote" ? `${e.items.length} item${e.items.length === 1 ? "" : "s"}: ${e.items.map((i) => `${i.productName} ×${i.quantity}`).join(", ")}` : e.message}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <div className="flex gap-1.5">
                      <Badge tone={e.type === "quote" ? "brand" : "neutral"}>{e.type === "quote" ? "Quote" : "Message"}</Badge>
                      <Badge tone={statusTone[e.status]}>{STATUS_LABEL[e.status]}</Badge>
                    </div>
                    <span className="text-[12px] text-steel-500">{timeAgo(e.createdAt)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
