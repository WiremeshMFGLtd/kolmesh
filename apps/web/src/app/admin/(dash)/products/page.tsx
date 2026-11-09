"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, Eye, EyeOff, Star } from "lucide-react";
import { useApi } from "@/components/admin/use-api";
import { Card, Empty, PageHeader, Skeleton } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";
import type { Category, Product } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [status, setStatus] = useState("");
  const { data: products, loading } = useApi<Product[]>("/admin/products");
  const { data: cats } = useApi<Category[]>("/admin/categories");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (products ?? []).filter((p) => (!s || p.name.toLowerCase().includes(s) || p.slug.includes(s)) && (!cat || p.categorySlug === cat) && (!status || (status === "active" ? p.isActive : status === "hidden" ? !p.isActive : status === "featured" ? p.isFeatured : !p.inStock)));
  }, [products, q, cat, status]);

  return (
    <>
      <PageHeader
        title="Products"
        description={products ? `${products.length} products across ${cats?.length ?? 0} categories` : undefined}
        actions={
          <Button href="/admin/products/new">
            <Plus size={16} /> New product
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col gap-3 border-b border-steel-200 p-4 md:flex-row md:items-center">
          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-steel-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-10 w-full rounded-[10px] border border-steel-200 pl-10 pr-3 text-[14px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10" />
          </label>
          <Select value={cat} onChange={(e) => setCat(e.target.value)} className="h-10 md:w-52">
            <option value="">All categories</option>
            {cats?.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 md:w-44">
            <option value="">Any status</option>
            <option value="active">Visible</option>
            <option value="hidden">Hidden</option>
            <option value="featured">Featured</option>
            <option value="mto">Made to order</option>
          </Select>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <Empty title="No products match" hint="Adjust the filters or add a new product." />
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead className="text-[12px] font-semibold text-steel-500">
                <tr className="border-b border-steel-200">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Photos</th>
                  <th className="px-4 py-3 font-semibold">Views</th>
                  <th className="px-4 py-3 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-200">
                {list.map((p) => (
                  <tr key={p.id} className="group hover:bg-steel-50">
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-steel-200 bg-steel-100">
                          <Image src={p.images[0]?.thumbUrl ?? "/placeholder-product.svg"} alt="" fill sizes="44px" className="object-cover" />
                        </span>
                        <span>
                          <span className="block font-semibold group-hover:text-brand-600">{p.name}</span>
                          <span className="block text-[12px] text-steel-500">/{p.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-steel-700">{p.categoryName}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {p.isActive ? (
                          <Badge tone="ok">
                            <Eye size={11} className="mr-1" /> Visible
                          </Badge>
                        ) : (
                          <Badge>
                            <EyeOff size={11} className="mr-1" /> Hidden
                          </Badge>
                        )}
                        {p.isFeatured && (
                          <Badge tone="brand">
                            <Star size={11} className="mr-1" /> Featured
                          </Badge>
                        )}
                        {!p.inStock && <Badge tone="warn">Made to order</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-steel-700">{p.images.filter((i) => i.url.startsWith("http")).length}</td>
                    <td className="px-4 py-2.5 text-steel-700">{p.viewCount ?? 0}</td>
                    <td className="px-4 py-2.5 text-steel-500">{p.updatedAt ? timeAgo(p.updatedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
