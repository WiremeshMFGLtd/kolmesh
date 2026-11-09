"use client";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Eye, Inbox, Package, Users } from "lucide-react";
import { useApi } from "@/components/admin/use-api";
import { useAuth } from "@/components/admin/auth";
import { Card, PageHeader, Skeleton, Empty } from "@/components/admin/page-header";
import { TrafficChart, EnquiryBars } from "@/components/admin/charts";
import { Badge, statusTone } from "@/components/ui/badge";
import type { Dashboard } from "@/lib/types";
import { pctChange, STATUS_LABEL, timeAgo } from "@/lib/utils";

function Tile({ label, value, delta, icon: Icon, hint }: { label: string; value: string | number; delta?: number; icon: React.ElementType; hint?: string }) {
  const up = (delta ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-steel-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-steel-500">{label}</p>
        <Icon size={18} className="text-steel-400" strokeWidth={1.9} />
      </div>
      <p className="mt-3 text-[30px] font-bold leading-none tracking-tight">{value}</p>
      <div className="mt-2 flex items-center gap-1.5 text-[12.5px]">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${up ? "text-ok" : "text-danger"}`}>
            {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(delta)}%
          </span>
        )}
        {hint && <span className="text-steel-500">{hint}</span>}
      </div>
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const { data, loading } = useApi<Dashboard>("/admin/dashboard");
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      <PageHeader title={`${greet}, ${user?.name.split(" ")[0]}`} description="Here is what is happening across the website." />
      {loading || !data ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Tile label="Enquiries this week" value={data.enquiries.last7} delta={pctChange(data.enquiries.last7, data.enquiries.prev7)} icon={Inbox} hint="vs previous 7 days" />
            <Tile label="Unread enquiries" value={data.enquiries.unread} icon={Inbox} hint={`${data.enquiries.quotes30} quote requests in 30 days`} />
            <Tile label="Page views, 30 days" value={data.traffic.last30.toLocaleString()} delta={pctChange(data.traffic.last30, data.traffic.prev30)} icon={Eye} hint={`${data.traffic.visitors30.toLocaleString()} visitors`} />
            <Tile label="Live products" value={data.counts.products} icon={Package} hint={data.counts.outOfStock ? `${data.counts.outOfStock} made to order` : `${data.counts.categories} categories`} />
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2" title="Traffic, last 30 days">
              <div className="p-4 pt-2">
                <TrafficChart data={data.series} />
              </div>
            </Card>
            <Card title="Enquiries per day">
              <div className="p-4 pt-2">
                <EnquiryBars data={data.series} />
                <ul className="mt-4 space-y-2">
                  {(["new", "in_progress", "quoted", "won", "lost"] as const).map((s) => (
                    <li key={s} className="flex items-center justify-between text-[13.5px]">
                      <Badge tone={statusTone[s]}>{STATUS_LABEL[s]}</Badge>
                      <span className="font-semibold">{data.byStatus[s] ?? 0}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card
              className="xl:col-span-2"
              title="Latest enquiries"
              action={
                <Link href="/admin/enquiries" className="text-[13px] font-semibold text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              }
            >
              {data.recentEnquiries.length === 0 ? (
                <Empty title="No enquiries yet" hint="New quote requests and messages will appear here." />
              ) : (
                <ul className="divide-y divide-steel-200">
                  {data.recentEnquiries.map((e) => (
                    <li key={e.id}>
                      <Link href={`/admin/enquiries/${e.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-steel-50">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${e.isRead ? "bg-transparent" : "bg-brand-500"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold">
                            {e.name} {e.company && <span className="font-normal text-steel-500">· {e.company}</span>}
                          </p>
                          <p className="truncate text-[13px] text-steel-500">{e.message || "(no message)"}</p>
                        </div>
                        <Badge tone={e.type === "quote" ? "brand" : "neutral"}>{e.type === "quote" ? "Quote" : "Message"}</Badge>
                        <span className="hidden w-20 text-right text-[12.5px] text-steel-500 sm:block">{timeAgo(e.createdAt)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Most viewed products">
              <ol className="divide-y divide-steel-200">
                {data.topProducts.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="w-5 text-[13px] font-bold text-steel-400">{i + 1}</span>
                    <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1 truncate text-[14px] font-medium hover:text-brand-600">
                      {p.name}
                    </Link>
                    <span className="text-[13px] text-steel-500">{p.viewCount} views</span>
                  </li>
                ))}
              </ol>
              <div className="flex items-center gap-2 border-t border-steel-200 px-5 py-3 text-[13px] text-steel-500">
                <Users size={14} /> {data.counts.admins} team member{data.counts.admins === 1 ? "" : "s"} with access
              </div>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
