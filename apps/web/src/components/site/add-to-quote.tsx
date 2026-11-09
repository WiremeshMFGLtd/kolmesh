"use client";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { useQuote } from "@/lib/quote-store";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AddToQuote({ product, variant, quantity = 1, size = "md", className, iconOnly }: { product: Product; variant?: string; quantity?: number; size?: "sm" | "md" | "lg"; className?: string; iconOnly?: boolean }) {
  const add = useQuote((s) => s.add);
  const [done, setDone] = useState(false);
  const img = product.images[0]?.thumbUrl ?? "/placeholder-product.svg";
  return (
    <Button
      size={size}
      variant={done ? "dark" : "primary"}
      className={cn(className, iconOnly && "h-10 w-10 px-0")}
      aria-label={`Add ${product.name} to quote list`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        add({ productId: product.id, slug: product.slug, name: product.name, image: img, variant, quantity });
        setDone(true);
        toast.success(`${product.name} added to your quote list`);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? <Check size={16} /> : <Plus size={16} />}
      {!iconOnly && (done ? "Added" : "Add to quote")}
    </Button>
  );
}
