"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { categories as categoriesApi } from "@/lib/api";
import type { CategoryDto } from "@/lib/types";
import ProductsPageContent from "@/components/ProductsPageContent";

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [category, setCategory] = useState<CategoryDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    categoriesApi.list().then((all) => {
      const found = all.find((c) => c.slug === slug);
      setCategory(found || null);
    }).catch(() => setCategory(null)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="pb-section-padding px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="animate-pulse">
          <div className="h-12 bg-surface-container rounded w-1/2 mb-4" />
          <div className="h-6 bg-surface-container rounded w-1/3 mb-12" />
        </div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="pb-section-padding px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto text-center py-20">
        <span className="material-symbols-outlined text-5xl text-outline mb-4">folder_off</span>
        <p className="font-body-md text-body-md text-on-surface-variant">Danh mục không tồn tại.</p>
      </div>
    );
  }

  return (
    <ProductsPageContent
      title={category.name}
      backLink={{ href: "/", label: "Trang chủ" }}
      initialCategoryIds={[category.id]}
      hideCategoryFilter
    />
  );
}
