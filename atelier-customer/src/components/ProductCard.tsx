"use client";

import Link from "next/link";
import type { ProductCustomerDto } from "@/lib/types";
import { formatCurrency } from "@/utils/format";

interface Props {
  product: ProductCustomerDto;
}

export default function ProductCard({ product }: Props) {
  return (
    <Link href={`/products/${product.slug}`} className="product-card group cursor-pointer">
      <div className="relative aspect-[4/5] w-full bg-surface-container overflow-hidden mb-4">
        {product.thumbnailUrl ? (
          <img
            src={product.thumbnailUrl}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">
              {product.name}
            </span>
          </div>
        )}
        
      </div>
      <h3 className="font-body-md text-body-md font-semibold mb-1 truncate">{product.name}</h3>
      <p className="font-body-md text-body-md text-secondary">{formatCurrency(product.minPrice)}</p>
    </Link>
  );
}
