"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { products as productsApi, attributes as attributesApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ToggleSwitch from "@/components/ToggleSwitch";
import ProductForm, { type ProductFormData } from "@/components/ProductForm";
import type { ProductDetailAdminDto, ProductVariantAdminDto, AttributeDto } from "@/lib/types";
import Link from "next/link";

export default function ProductDetailPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetailAdminDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attrList, setAttrList] = useState<AttributeDto[]>([]);
  const [deletingVariant, setDeletingVariant] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const editFormRef = useRef<HTMLFormElement | null>(null);
  const [variantModal, setVariantModal] = useState<"add" | "edit" | null>(null);
  const [editingVariant, setEditingVariant] = useState<ProductVariantAdminDto | null>(null);
  const [variantForm, setVariantForm] = useState({
    sku: "", price: 0, isDefault: false, isActive: true, imageUrl: "", attributeOptionIds: [] as number[],
  });
  const [variantSubmitting, setVariantSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      productsApi.adminDetail(Number(id)),
      attributesApi.admin(),
    ])
      .then(([p, attrs]) => {
        setProduct(p);
        setAttrList(attrs);
      })
      .catch(() => setError("Không thể tải thông tin"))
      .finally(() => setLoading(false));
  }, [id]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

  const reloadProduct = async () => {
    const updated = await productsApi.adminDetail(Number(id));
    setProduct(updated);
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!await confirm("Xóa biến thể này?")) return;
    setDeletingVariant(variantId);
    try {
      await productsApi.deleteVariant(variantId);
      showToast("Xóa biến thể thành công", "success");
      await reloadProduct();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xóa biến thể thất bại", "error");
    } finally {
      setDeletingVariant(null);
    }
  };

  const generateNextSku = () => {
    const prefix = "ATL";
    const num = String(Number(id)).padStart(3, "0");
    const existing = product?.variants || [];
    const pattern = new RegExp(`^${prefix}${num}-([A-Z])$`);
    const usedLetters = existing
      .map((v) => pattern.exec(v.sku))
      .filter(Boolean)
      .map((m) => m![1]);
    const nextLetter = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").find((l) => !usedLetters.includes(l)) || "Z";
    return `${prefix}${num}-${nextLetter}`;
  };

  const openAddVariant = () => {
    setEditingVariant(null);
    setVariantForm({ sku: generateNextSku(), price: 0, isDefault: false, isActive: true, imageUrl: "", attributeOptionIds: [] });
    setVariantModal("add");
  };

  const openEditVariant = (v: ProductVariantAdminDto) => {
    setEditingVariant(v);
    setVariantForm({
      sku: v.sku, price: v.price, isDefault: v.isDefault, isActive: v.isActive,
      imageUrl: v.thumbnailUrl ?? "", attributeOptionIds: v.attributes.map((a) => a.optionId),
    });
    setVariantModal("edit");
  };

  const toggleOption = (optionId: number) => {
    setVariantForm((prev) => ({
      ...prev,
      attributeOptionIds: prev.attributeOptionIds.includes(optionId)
        ? prev.attributeOptionIds.filter((id) => id !== optionId)
        : [...prev.attributeOptionIds, optionId],
    }));
  };

  const handleVariantSubmit = async () => {
    if (!variantForm.sku.trim()) return showToast("SKU là bắt buộc");
    setVariantSubmitting(true);
    try {
      if (variantModal === "add") {
        await productsApi.createVariant(Number(id), {
          sku: variantForm.sku, price: Number(variantForm.price),
          isDefault: variantForm.isDefault, imageUrl: variantForm.imageUrl || undefined,
          attributeOptionIds: variantForm.attributeOptionIds.length > 0 ? variantForm.attributeOptionIds : undefined,
        });
        showToast("Thêm biến thể thành công", "success");
      } else if (editingVariant) {
        await productsApi.updateVariant(editingVariant.id, {
          sku: variantForm.sku, price: variantForm.price,
          isDefault: variantForm.isDefault, isActive: variantForm.isActive,
          imageUrl: variantForm.imageUrl || undefined,
          attributeOptionIds: variantForm.attributeOptionIds.length > 0 ? variantForm.attributeOptionIds : undefined,
        } as any);
        showToast("Cập nhật biến thể thành công", "success");
      }
      setVariantModal(null);
      await reloadProduct();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setVariantSubmitting(false);
    }
  };

  const handleEditProductSubmit = async (formData: ProductFormData) => {
    setEditLoading(true);
    try {
      await productsApi.update(Number(id), formData as any);
      showToast("Cập nhật sản phẩm thành công", "success");
      setEditModalOpen(false);
      await reloadProduct();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!product || !await confirm(`Xóa sản phẩm "${product.name}"?`)) return;
    try {
      await productsApi.delete(product.id);
      showToast("Xóa sản phẩm thành công", "success");
      router.push("/products");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Xóa thất bại", "error");
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-on-surface-variant animate-pulse">Đang tải...</div>;
  }

  if (error || !product) {
    return <div className="p-8 text-center text-error">{error || "Không tìm thấy sản phẩm"}</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <Link href="/products" className="font-label-caps text-button-text text-on-surface-variant hover:text-primary">
            &larr; Danh sách sản phẩm
          </Link>
          <h2 className="font-headline-md text-headline-md text-primary mt-2">{product.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-body-md text-body-md text-on-surface-variant">{product.categoryName}</span>
            <span className="w-px h-3 bg-outline-variant" />
            <span className="font-label-caps text-label-caps text-on-surface-variant">{product.variants.length} biến thể</span>
            {product.isFeatured && <span className="font-label-caps text-label-caps bg-secondary text-white px-2 py-0.5">NỔI BẬT</span>}
            {product.isPreorder && <span className="font-label-caps text-label-caps bg-primary/10 text-primary px-2 py-0.5">PRE-ORDER</span>}
            <span className={`inline-block w-2 h-2 rounded-full ${product.isActive ? "bg-secondary" : "bg-error"}`} />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setEditModalOpen(true)}
            className="font-label-caps text-label-caps border border-primary px-4 py-2 hover:bg-primary hover:text-white transition-all"
          >
            CHỈNH SỬA
          </button>
          <button
            onClick={handleDeleteProduct}
            className="font-label-caps text-label-caps border border-error text-error px-4 py-2 hover:bg-error hover:text-white transition-all"
          >
            XOÁ
          </button>
        </div>
      </div>

      {/* Product info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {product.shortDescription && (
            <div>
              <h3 className="font-label-caps text-button-text text-on-surface-variant tracking-wider mb-1.5">MÔ TẢ NGẮN</h3>
              <p className="font-body-md text-body-md">{product.shortDescription}</p>
            </div>
          )}
          {product.description && (
            <div>
              <h3 className="font-label-caps text-button-text text-on-surface-variant tracking-wider mb-1.5">MÔ TẢ CHI TIẾT</h3>
              <div className="font-body-md text-body-md whitespace-pre-wrap">{product.description}</div>
            </div>
          )}
          {product.story && (
            <div>
              <h3 className="font-label-caps text-button-text text-on-surface-variant tracking-wider mb-1.5">STORY</h3>
              <div className="font-body-md text-body-md whitespace-pre-wrap">{product.story}</div>
            </div>
          )}
          {product.collectionNames.length > 0 && (
            <div>
              <h3 className="font-label-caps text-button-text text-on-surface-variant tracking-wider mb-1.5">BỘ SƯU TẬP</h3>
              <div className="flex flex-wrap gap-2">
                {product.collectionNames.map((name) => (
                  <span key={name} className="font-label-caps text-label-caps bg-secondary/10 text-secondary px-2 py-0.5">{name}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar meta */}
        <div className="bg-surface-container-lowest border border-outline-variant p-4 space-y-3 h-fit">
          <div className="flex justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">SLUG</span>
            <span className="font-body-md text-body-md">/{product.slug}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">LƯỢT XEM</span>
            <span className="font-body-md font-bold">{product.viewsCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant">NGÀY TẠO</span>
            <span className="font-body-md text-body-md">{new Date(product.createdAt).toLocaleDateString("vi-VN")}</span>
          </div>
        </div>
      </div>

      {/* Variants section */}
      <section className="border-t border-outline-variant/30 pt-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-label-caps text-button-text text-primary border-b-2 border-secondary pb-2">
            BIẾN THỂ ({product.variants.length})
          </h3>
          <button
            onClick={openAddVariant}
            className="font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all"
          >
            + THÊM BIẾN THỂ
          </button>
        </div>

        {/* Variant cards */}
        {product.variants.length === 0 ? (
          <p className="text-on-surface-variant font-body-md">Chưa có biến thể nào</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {product.variants.map((v) => (
              <div key={v.id} className={`border ${!v.isActive ? "border-error/30 bg-error-container/30" : "border-outline-variant"} p-4 space-y-3`}>
                <div className="flex gap-3">
                  {v.thumbnailUrl && (
                    <img src={v.thumbnailUrl} alt={v.sku} className="w-20 h-20 object-cover shrink-0 border border-outline-variant" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-body-md font-bold truncate">{v.sku}</span>
                      {!v.isActive && <span className="font-label-caps text-label-caps text-error shrink-0">(TẮT)</span>}
                    </div>
                    <div className="font-headline-md text-headline-md text-secondary mt-0.5">{formatCurrency(v.price)}</div>
                    <div className="font-body-md text-body-md text-on-surface-variant">
                      Tồn kho: <span className="font-bold text-on-surface">{v.quantity}</span>
                    </div>
                    {v.weight != null && (
                      <div className="font-body-md text-body-md text-on-surface-variant">
                        Cân nặng: <span className="font-bold text-on-surface">{v.weight}g</span>
                      </div>
                    )}
                  </div>
                </div>

                {v.attributes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {v.attributes.map((a) => (
                      <span key={a.optionId} className="font-label-caps text-label-caps bg-surface-container-high text-on-surface-variant px-2 py-0.5">
                        {a.attributeName}: {a.optionValue}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30">
                  <div className="flex items-center gap-2">
                    {v.isDefault && <span className="font-label-caps text-label-caps text-secondary">MẶC ĐỊNH</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEditVariant(v)}
                      className="font-label-caps text-label-caps border border-outline-variant px-2 py-1 hover:bg-surface-container-high transition-all">
                      SỬA
                    </button>
                    <button onClick={() => handleDeleteVariant(v.id)} disabled={deletingVariant === v.id}
                      className="font-label-caps text-label-caps border border-error text-error px-2 py-1 hover:bg-error hover:text-white transition-all disabled:opacity-50">
                      {deletingVariant === v.id ? "..." : "XOÁ"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Edit product modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="SỬA SẢN PHẨM"
        onSubmit={() => editFormRef.current?.requestSubmit()}
        submitLabel="Cập nhật"
        submitting={editLoading}
        size="lg"
      >
        <ProductForm
          formRef={editFormRef}
          hideSubmitButton
          initialData={{
            name: product.name,
            slug: product.slug || "",
            shortDescription: product.shortDescription || "",
            description: product.description || "",
            story: product.story || "",
            categoryId: product.categoryId,
            isFeatured: product.isFeatured,
            isPreorder: product.isPreorder,
            isActive: product.isActive,
            collectionIds: product.collectionIds,
          }}
          onSubmit={handleEditProductSubmit}
          loading={editLoading}
          submitLabel="Cập nhật"
        />
      </Modal>

      {/* Add/Edit variant modal */}
      <Modal
        open={variantModal !== null}
        onClose={() => setVariantModal(null)}
        title={variantModal === "add" ? "THÊM BIẾN THỂ" : "SỬA BIẾN THỂ"}
        onSubmit={handleVariantSubmit}
        submitLabel={variantModal === "add" ? "Thêm" : "Cập nhật"}
        submitting={variantSubmitting}
        size="lg"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">SKU *</label>
            <input value={variantForm.sku} onChange={(e) => setVariantForm({ ...variantForm, sku: e.target.value })}
              placeholder="Mã SKU"
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">GIÁ</label>
            <input type="number" value={variantForm.price || ""} onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value ? Number(e.target.value) : 0 })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary" />
          </div>
          <div className="flex items-end gap-4 pb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={variantForm.isDefault} onChange={(e) => setVariantForm({ ...variantForm, isDefault: e.target.checked })} className="w-4 h-4 accent-primary" />
              <span className="font-body-md text-body-md">Mặc định</span>
            </label>
            {variantModal === "edit" && (
              <label className="flex items-center gap-2 cursor-pointer">
                <ToggleSwitch checked={variantForm.isActive} onChange={(checked) => setVariantForm({ ...variantForm, isActive: checked })} />
                <span className="font-body-md text-body-md">Kích hoạt</span>
              </label>
            )}
          </div>
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">ẢNH (URL)</label>
          <input value={variantForm.imageUrl} onChange={(e) => setVariantForm({ ...variantForm, imageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary" />
          {variantForm.imageUrl && (
            <img src={variantForm.imageUrl} alt="preview" className="mt-2 h-20 w-20 object-cover border border-outline-variant" />
          )}
        </div>
        {attrList.length > 0 && (
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-2">THUỘC TÍNH</label>
            <div className="space-y-2">
              {attrList.map((attr) => (
                <div key={attr.id}>
                  <p className="font-label-caps text-label-caps text-on-surface-variant mb-1">{attr.name}</p>
                  <div className="flex flex-wrap gap-2">
                    {attr.options.map((opt) => (
                      <button key={opt.id} type="button" onClick={() => toggleOption(opt.id)}
                        className={`font-label-caps text-label-caps px-2 py-1 border transition-all ${variantForm.attributeOptionIds.includes(opt.id) ? "bg-primary text-white border-primary" : "border-outline-variant text-on-surface-variant hover:border-primary"}`}>
                        {opt.value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
