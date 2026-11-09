"use client";
import { useState } from "react";
import { useApi } from "@/components/admin/use-api";
import { Card, Empty, PageHeader, Skeleton } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import type { AuditLog } from "@/lib/types";
import { fmtDateTime } from "@/lib/utils";

const PAGE = 50;

export default function AuditPage() {
  const [offset, setOffset] = useState(0);
  const { data, loading } = useApi<{ items: AuditLog[]; total: number }>(`/admin/audit?limit=${PAGE}&offset=${offset}`);
  return (
    <>
      <PageHeader title="Audit log" description="Every sign-in attempt and content change, with who did it and from where." />
      <Card>
        {loading && !data ? (
          <Skeleton className="m-4 h-64" />
        ) : !data?.items.length ? (
          <Empty title="No activity recorded yet" />
        ) : (
          <>
            <table className="w-full text-left text-[13.5px]">
              <thead className="text-[12px] text-steel-500">
                <tr className="border-b border-steel-200">
                  <th className="px-5 py-3 font-semibold">When</th>
                  <th className="px-5 py-3 font-semibold">Who</th>
                  <th className="px-5 py-3 font-semibold">Action</th>
                  <th className="px-5 py-3 font-semibold">Details</th>
                  <th className="px-5 py-3 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-200">
                {data.items.map((a) => (
                  <tr key={a.id}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-steel-600">{fmtDateTime(a.createdAt)}</td>
                    <td className="px-5 py-2.5">{a.adminEmail ?? <span className="text-steel-400">anonymous</span>}</td>
                    <td className="px-5 py-2.5">
                      <code className={`rounded-md px-1.5 py-0.5 text-[12px] ${a.action.includes("failed") || a.action.includes("reuse") ? "bg-danger/10 text-danger" : "bg-steel-100 text-steel-700"}`}>{a.action}</code>
                    </td>
                    <td className="max-w-md truncate px-5 py-2.5 text-steel-600">
                      {a.entity && `${a.entity} `}
                      {a.meta ? JSON.stringify(a.meta) : ""}
                    </td>
                    <td className="px-5 py-2.5 text-steel-500">{a.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between border-t border-steel-200 px-5 py-3 text-[13px] text-steel-500">
              <span>
                {offset + 1}–{Math.min(offset + PAGE, data.total)} of {data.total}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>
                  Newer
                </Button>
                <Button size="sm" variant="secondary" disabled={offset + PAGE >= data.total} onClick={() => setOffset(offset + PAGE)}>
                  Older
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
