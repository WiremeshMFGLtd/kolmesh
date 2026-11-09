"use client";
import { use } from "react";
import { useApi } from "@/components/admin/use-api";
import { PageHeader, Skeleton } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import type { Category, Product } from "@/lib/types";

export default function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useApi<Product & { category?: Category }>(`/admin/products/${id}`);
  if (loading) return <Skeleton className="h-96" />;
  if (error || !data) return <p className="text-danger">{error ?? "Not found"}</p>;
  return (
    <>
      <PageHeader title={data.name} description={`In ${data.category?.name ?? "—"}`} />
      <ProductForm key={data.id} product={{ ...data, categoryName: data.category?.name ?? "", categorySlug: data.category?.slug ?? "" }} />
    </>
  );
}
