"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { products as productsApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import ProductForm from "@/components/ProductForm";
import type { ProductFormData } from "@/components/ProductForm";
import type { ProductDetailAdminDto } from "@/lib/types";

export default function EditProductPage() {
  const { showToast } = useToast();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetailAdminDto | null>(null);
  const [initial, setInitial] = useState<ProductFormData | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    productsApi
      .adminDetail(Number(id))
      .then((p) => {
        setProduct(p);
        setInitial({
          name: p.name,
          slug: p.slug || "",
          shortDescription: p.shortDescription || "",
          description: p.description || "",
          story: p.story || "",
          categoryId: p.categoryId,
          isFeatured: p.isFeatured,
          isPreorder: p.isPreorder,
          isActive: p.isActive,
          collectionIds: p.collectionIds || [],
        });
      })
      .catch(() => setError("Không thể tải thông tin sản phẩm"))
      .finally(() => setPageLoading(false));
  }, [id]);

  const handleSubmit = async (data: ProductFormData) => {
    setSaving(true);
    try {
      await productsApi.update(Number(id), data);
      router.push("/products");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      showToast("Cập nhật thất bại: " + msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (pageLoading) {
    return <div className="p-8 text-center text-on-surface-variant animate-pulse">Đang tải...</div>;
  }

  if (error || !initial || !product) {
    return <div className="p-8 text-center text-error">{error || "Không tìm thấy sản phẩm"}</div>;
  }

  return (
    <div>
      <button onClick={() => router.back()} className="block font-label-caps text-button-text text-on-surface-variant hover:text-primary mb-3">
        &larr; Quay lại
      </button>

      <h3 className="font-headline-md text-headline-md text-center text-primary mb-6">
        CHỈNH SỬA SẢN PHẨM
      </h3>

      {/* Product info summary */}
      <div className="bg-white border border-outline-variant p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-5">
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant">DANH MỤC</p>
          <p className="font-body-md text-body-md mt-0.5">{product.categoryName}</p>
        </div>
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant">BIẾN THỂ</p>
          <p className="font-body-md text-body-md mt-0.5">{product.variants.length}</p>
        </div>
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant">TRẠNG THÁI</p>
          <p className={`font-body-md text-body-md mt-0.5 ${product.isActive ? "text-secondary" : "text-error"}`}>
            {product.isActive ? "ĐANG BÁN" : "NGỪNG BÁN"}
          </p>
        </div>
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant">NGÀY TẠO</p>
          <p className="font-body-md text-body-md mt-0.5">{new Date(product.createdAt).toLocaleDateString("vi-VN")}</p>
        </div>
      </div>

      <ProductForm initialData={initial} onSubmit={handleSubmit} loading={saving} submitLabel="CẬP NHẬT" />
    </div>
  );
}
