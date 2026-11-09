import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { AddToQuote } from "./add-to-quote";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const img = product.images[0];
  return (
    <article className="group relative flex flex-col">
      <Link href={`/products/${product.slug}`} className="relative block aspect-square overflow-hidden bg-steel-100">
        <Image
          src={img?.thumbUrl ?? "/placeholder-product.svg"}
          alt={img?.alt || product.name}
          fill
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(.16,1,.3,1)] group-hover:scale-[1.04]"
        />
        {!product.inStock && (
          <Badge tone="neutral" className="absolute left-3 top-3 bg-white/90">
            Made to order
          </Badge>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4 md:p-5">
        <p className="text-[12px] font-semibold text-brand-600">{product.categoryName}</p>
        <h3 className="mt-1 text-[15px] font-bold leading-snug md:text-base">
          <Link href={`/products/${product.slug}`} className="after:absolute after:inset-0 after:content-[''] group-hover:text-brand-700">
            {product.name}
          </Link>
        </h3>
        {product.specs[0] && <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-steel-500">{product.specs[0]}</p>}
        <div className="relative z-10 mt-auto pt-4">
          <AddToQuote product={product} size="sm" className="w-full" />
        </div>
      </div>
    </article>
  );
}
