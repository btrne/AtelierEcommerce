"use client";

import type { ProductCustomerDto } from "@/lib/types";
import ProductCard from "./ProductCard";

interface Props {
  products: ProductCustomerDto[];
}

export default function ProductGrid({ products }: Props) {
  if (products.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="material-symbols-outlined text-5xl text-outline mb-4">inventory_2</span>
        <p className="text-body-md text-on-surface-variant">Không có sản phẩm nào</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
      {products.map((product) => (
        <div key={product.id} className="w-full max-w-[214px] mx-auto">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  );
}
