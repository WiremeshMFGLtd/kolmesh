"use client";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";

export default function NewProduct() {
  return (
    <>
      <PageHeader title="New product" description="Fill in the details, save, then add photos." />
      <ProductForm />
    </>
  );
}
