import type { Metadata } from "next";
import { QuoteForm } from "@/components/site/quote-form";

export const metadata: Metadata = { title: "Request a quote", description: "Send your product list to KOL Wire Mesh and receive a quote within one business day." };

export default function QuotePage() {
  return (
    <div className="mx-auto max-w-[1280px] px-5 pt-8 md:px-8 md:pt-12">
      <div className="max-w-2xl">
        <h1 className="display text-4xl md:text-5xl">Request a quote</h1>
        <p className="measure mt-4 text-[16px] leading-relaxed text-steel-600">Review your list, tell us where the job is, and we come back with pricing, lead time and delivery within one business day.</p>
      </div>
      <QuoteForm />
    </div>
  );
}
