"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { categories } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ToggleSwitch from "@/components/ToggleSwitch";
import ProductForm, { type ProductFormData } from "@/components/ProductForm";
import type { CategoryAdminDto, ProductAdminDto } from "@/lib/types";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

export default function CategoriesPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<CategoryAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryAdminDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", isActive: true });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const autoSlug = (name: string) => name.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  useEffect(() => {
    if (!slugManuallyEdited && form.name) {
      setForm((prev) => ({ ...prev, slug: autoSlug(prev.name) }));
    }
  }, [form.name, slugManuallyEdited]);

  // Product management state
  const [productModalCategory, setProductModalCategory] = useState<CategoryAdminDto | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<ProductAdminDto[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Create product modal
  const [createProductModalOpen, setCreateProductModalOpen] = useState(false);
  const [createProductLoading, setCreateProductLoading] = useState(false);
  const createFormRef = useRef<HTMLFormElement | null>(null);

  const fetchData = () => {
    setLoading(true);
    categories
      .admin()
      .then((res) => setData(Array.isArray(res) ? res : (res as any).items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", isActive: true });
    setSlugManuallyEdited(false);
    setModalOpen(true);
  };

  const openEdit = (cat: CategoryAdminDto) => {
    setEditing(cat);
    setForm({ name: cat.name, slug: cat.slug || "", isActive: cat.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = { ...form, slug: form.slug || undefined };
      if (editing) {
        await categories.update(editing.id, payload);
        showToast("Cập nhật danh mục thành công", "success");
      } else {
        await categories.create(payload);
        showToast("Tạo danh mục thành công", "success");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi";
      showToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirm("Xóa danh mục này?")) {
      try {
        await categories.delete(id);
        showToast("Xóa danh mục thành công", "success");
        fetchData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Lỗi";
        showToast(message);
      }
    }
  };

  // Product management
  const openProductModal = useCallback(async (cat: CategoryAdminDto) => {
    setProductModalCategory(cat);
    setProductsLoading(true);
    try {
      const products = await categories.getProducts(cat.id);
      setCategoryProducts(products);
    } catch {
      showToast("Lỗi tải sản phẩm", "error");
    } finally {
      setProductsLoading(false);
    }
  }, [showToast]);

  const handleCreateProduct = async () => {
    setCreateProductModalOpen(true);
  };

  const handleProductSubmit = async (formData: ProductFormData) => {
    if (!productModalCategory) return;
    setCreateProductLoading(true);
    try {
      await categories.createProduct(productModalCategory.id, {
        name: formData.name,
        slug: formData.slug,
        shortDescription: formData.shortDescription,
        description: formData.description,
        isFeatured: formData.isFeatured,
        isPreorder: formData.isPreorder,
        isActive: formData.isActive,
      });
      showToast("Tạo sản phẩm thành công", "success");
      setCreateProductModalOpen(false);
      // Refresh products
      const products = await categories.getProducts(productModalCategory.id);
      setCategoryProducts(products);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi";
      showToast(message);
    } finally {
      setCreateProductLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + THÊM DANH MỤC
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="col-span-full p-6 text-center text-on-surface-variant">Chưa có danh mục</div>
        ) : (
          data.map((cat) => (
            <div key={cat.id} className="border border-outline-variant bg-surface p-4 space-y-3 cursor-pointer" onClick={() => openProductModal(cat)}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-body-md font-bold">{cat.name}</h3>
                  <p className="text-body-md text-on-surface-variant">/{cat.slug}</p>
                </div>
                <span className={`inline-block w-2 h-2 rounded-full mt-2 ${cat.isActive ? "bg-secondary" : "bg-error"}`} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-button-text text-on-surface-variant">{cat.productCount} sản phẩm</span>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(cat)} className="font-label-caps text-button-text border border-primary px-2 py-0.5 hover:bg-primary hover:text-white transition-all">
                    SỬA
                  </button>
                  <button onClick={() => handleDelete(cat.id)} className="font-label-caps text-button-text border border-error text-error px-2 py-0.5 hover:bg-error hover:text-white transition-all">
                    XÓA
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal sửa danh mục */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "SỬA DANH MỤC" : "THÊM DANH MỤC"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Cập nhật" : "Tạo"}
        submitting={submitting}
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">TÊN DANH MỤC</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nhập tên danh mục"
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">SLUG</label>
            <input
              value={form.slug}
              onChange={(e) => { setForm({ ...form, slug: e.target.value }); setSlugManuallyEdited(true); }}
              placeholder="slug-danh-muc"
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch checked={form.isActive} onChange={(checked) => setForm({ ...form, isActive: checked })} />
          <span className="font-body-md text-body-md">Kích hoạt</span>
        </div>
      </Modal>

      {/* Modal xem sản phẩm trong danh mục */}
      <Modal
        open={productModalCategory !== null}
        onClose={() => setProductModalCategory(null)}
        title={`SẢN PHẨM — ${productModalCategory?.name || ""}`}
        onSubmit={handleCreateProduct}
        submitLabel="+ THÊM SẢN PHẨM"
        submitting={createProductLoading}
        size="lg"
      >
        {productsLoading ? (
          <div className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải sản phẩm...</div>
        ) : categoryProducts.length === 0 ? (
          <div className="p-6 text-center text-on-surface-variant">Chưa có sản phẩm nào trong danh mục</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {categoryProducts.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 border border-outline-variant/50">
                {p.thumbnailUrl ? (
                  <img src={p.thumbnailUrl} alt="" className="w-12 h-12 object-cover bg-surface-container-high shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-surface-container-high flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-on-surface-variant/30">image</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${p.id}`} className="font-body-md font-bold text-primary hover:underline truncate block">
                    {p.name}
                  </Link>
                  <p className="text-body-md text-on-surface-variant text-sm">{formatCurrency(p.minPrice)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal tạo sản phẩm mới */}
      <Modal
        open={createProductModalOpen}
        onClose={() => setCreateProductModalOpen(false)}
        title="THÊM SẢN PHẨM MỚI"
        onSubmit={() => createFormRef.current?.requestSubmit()}
        submitLabel="Tạo"
        submitting={createProductLoading}
        size="lg"
      >
        <ProductForm
          formRef={createFormRef}
          hideSubmitButton
          onSubmit={handleProductSubmit}
          loading={createProductLoading}
        />
      </Modal>
    </div>
  );
}