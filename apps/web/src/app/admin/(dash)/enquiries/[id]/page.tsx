"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Mail, MessageCircle, Phone, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/client";
import { useApi } from "@/components/admin/use-api";
import { useAuth } from "@/components/admin/auth";
import { Card, Skeleton } from "@/components/admin/page-header";
import { Badge, statusTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import type { Enquiry, EnquiryStatus } from "@/lib/types";
import { fmtDateTime, STATUS_LABEL } from "@/lib/utils";

export default function EnquiryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { data, loading, setData } = useApi<Enquiry>(`/admin/enquiries/${id}`);
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (data) setNotes(data.adminNotes);
  }, [data]);

  async function patch(body: Partial<Pick<Enquiry, "status" | "adminNotes">>) {
    try {
      const r = await api<Enquiry>(`/admin/enquiries/${id}`, { method: "PATCH", json: body });
      setData((d) => (d ? { ...d, ...r, items: d.items } : d));
      toast.success("Saved");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Could not save");
    }
  }

  async function remove() {
    if (!data || !confirm(`Delete ${data.reference}?`)) return;
    await api(`/admin/enquiries/${id}`, { method: "DELETE" });
    toast.success("Deleted");
    router.replace("/admin/enquiries");
  }

  if (loading || !data) return <Skeleton className="h-96" />;

  const wa = data.phone ? `https://wa.me/${data.phone.replace(/\D/g, "")}` : null;
  const subject = encodeURIComponent(`Re: ${data.reference} — ${data.type === "quote" ? "your quote request" : "your message"} to KOL Wire Mesh`);

  return (
    <>
      <Link href="/admin/enquiries" className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-steel-600 hover:text-ink">
        <ArrowLeft size={15} /> All enquiries
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[26px] font-bold tracking-tight">{data.name}</h1>
            <Badge tone={data.type === "quote" ? "brand" : "neutral"}>{data.type === "quote" ? "Quote request" : "Message"}</Badge>
          </div>
          <p className="mt-1 text-[14px] text-steel-500">
            {data.reference} · {fmtDateTime(data.createdAt)}
            {data.company && ` · ${data.company}`}
            {data.location && ` · ${data.location}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={`mailto:${data.email}?subject=${subject}`} variant="secondary" size="sm">
            <Mail size={15} /> Reply by email
          </Button>
          {wa && (
            <Button href={wa} target="_blank" rel="noopener noreferrer" variant="secondary" size="sm">
              <MessageCircle size={15} /> WhatsApp
            </Button>
          )}
          {data.phone && (
            <Button href={`tel:${data.phone}`} variant="secondary" size="sm">
              <Phone size={15} /> {data.phone}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {data.items.length > 0 && (
            <Card title={`Requested items (${data.items.length})`}>
              <table className="w-full text-left text-[14px]">
                <thead className="text-[12px] text-steel-500">
                  <tr className="border-b border-steel-200">
                    <th className="px-5 py-2.5 font-semibold">Product</th>
                    <th className="px-5 py-2.5 font-semibold">Option</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-5 py-2.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-200">
                  {data.items.map((i) => (
                    <tr key={i.id}>
                      <td className="px-5 py-3 font-semibold">
                        {i.product?.slug ? (
                          <Link href={`/products/${i.product.slug}`} target="_blank" className="inline-flex items-center gap-1 hover:text-brand-600">
                            {i.productName} <ExternalLink size={12} className="text-steel-400" />
                          </Link>
                        ) : (
                          i.productName
                        )}
                      </td>
                      <td className="px-5 py-3 text-steel-600">{i.variant ?? "—"}</td>
                      <td className="px-5 py-3 text-right font-semibold">{i.quantity}</td>
                      <td className="px-5 py-3 text-steel-600">{i.note ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          <Card title="Message">
            <p className="whitespace-pre-wrap p-5 text-[15px] leading-relaxed">{data.message || <span className="text-steel-400">No message was included.</span>}</p>
          </Card>
          <Card title="Internal notes" action={<span className="text-[12.5px] text-steel-500">Only visible to the team</span>}>
            <div className="p-5">
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Quote sent 12 May, awaiting PO…" />
              <Button size="sm" className="mt-3" onClick={() => patch({ adminNotes: notes })} disabled={notes === data.adminNotes}>
                Save notes
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Status">
            <div className="space-y-3 p-5">
              <Select value={data.status} onChange={(e) => patch({ status: e.target.value as EnquiryStatus })}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Badge tone={statusTone[data.status]}>{STATUS_LABEL[data.status]}</Badge>
            </div>
          </Card>
          <Card title="Contact">
            <dl className="divide-y divide-steel-200 text-[14px]">
              {[
                ["Email", <a key="e" href={`mailto:${data.email}`} className="text-brand-600 hover:underline">{data.email}</a>],
                ["Phone", data.phone ?? "—"],
                ["Company", data.company ?? "—"],
                ["Location", data.location ?? "—"],
                ["Source IP", data.ipAddress ?? "—"],
              ].map(([k, v]) => (
                <div key={String(k)} className="flex justify-between gap-4 px-5 py-2.5">
                  <dt className="text-steel-500">{k}</dt>
                  <dd className="truncate text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
          {(user?.role === "owner" || user?.role === "admin") && (
            <Button variant="danger" className="w-full" onClick={remove}>
              <Trash2 size={15} /> Delete enquiry
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
