"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { collections as collectionsApi, products as productsApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ToggleSwitch from "@/components/ToggleSwitch";
import ProductForm, { type ProductFormData } from "@/components/ProductForm";
import type { CollectionAdminDto, ProductAdminDto } from "@/lib/types";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

export default function CollectionsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<CollectionAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CollectionAdminDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", bannerImageUrl: "", description: "", releaseDate: "", isActive: true });
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const autoSlug = (name: string) => name.toLowerCase().replace(/đ/g, "d").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  useEffect(() => {
    if (!slugManuallyEdited && form.name) {
      setForm((prev) => ({ ...prev, slug: autoSlug(prev.name) }));
    }
  }, [form.name, slugManuallyEdited]);

  // Product management state
  const [productModalCollection, setProductModalCollection] = useState<CollectionAdminDto | null>(null);
  const [collectionProducts, setCollectionProducts] = useState<ProductAdminDto[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [addProductModal, setAddProductModal] = useState(false);
  const [allProducts, setAllProducts] = useState<ProductAdminDto[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [addingProduct, setAddingProduct] = useState<number | null>(null);

  // Create product modal
  const [createProductModalOpen, setCreateProductModalOpen] = useState(false);
  const [createProductLoading, setCreateProductLoading] = useState(false);
  const createFormRef = useRef<HTMLFormElement | null>(null);

  const fetchData = () => {
    setLoading(true);
    collectionsApi
      .admin()
      .then((res: any) => setData(Array.isArray(res) ? res : res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", bannerImageUrl: "", description: "", releaseDate: "", isActive: true });
    setSlugManuallyEdited(false);
    setModalOpen(true);
  };

  const openEdit = (col: CollectionAdminDto) => {
    setEditing(col);
    setForm({ name: col.name, slug: col.slug || "", bannerImageUrl: col.bannerImageUrl || "", description: col.description || "", releaseDate: col.releaseDate || "", isActive: col.isActive });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = { ...form, bannerImageUrl: form.bannerImageUrl || undefined };
      if (editing) {
        await collectionsApi.update(editing.id, payload);
        showToast("Cập nhật bộ sưu tập thành công", "success");
      } else {
        await collectionsApi.create(payload);
        showToast("Tạo bộ sưu tập thành công", "success");
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirm("Xóa bộ sưu tập này?")) {
      try {
        await collectionsApi.delete(id);
        showToast("Xóa bộ sưu tập thành công", "success");
        fetchData();
      } catch (err: any) {
        showToast(err.message || "Lỗi", "error");
      }
    }
  };

  // Product management
  const openProductModal = useCallback(async (col: CollectionAdminDto) => {
    setProductModalCollection(col);
    setProductsLoading(true);
    try {
      const products = await collectionsApi.getProducts(col.id);
      setCollectionProducts(products);
    } catch {
      showToast("Lỗi tải sản phẩm", "error");
    } finally {
      setProductsLoading(false);
    }
  }, [showToast]);

  const openAddProduct = async () => {
    setProductSearch("");
    setAddProductModal(true);
    try {
      const res = await productsApi.admin({ page: 1, pageSize: 100 });
      setAllProducts(res.items);
    } catch {
      showToast("Lỗi tải danh sách sản phẩm", "error");
    }
  };

  const handleAddProduct = async (productId: number) => {
    if (!productModalCollection) return;
    setAddingProduct(productId);
    try {
      await collectionsApi.addProduct(productModalCollection.id, productId);
      showToast("Đã thêm sản phẩm vào bộ sưu tập");
      const products = await collectionsApi.getProducts(productModalCollection.id);
      setCollectionProducts(products);
      setAddProductModal(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setAddingProduct(null);
    }
  };

  const handleRemoveProduct = async (productId: number) => {
    if (!productModalCollection) return;
    if (!await confirm("Xóa sản phẩm khỏi bộ sưu tập?")) return;
    try {
      await collectionsApi.removeProduct(productModalCollection.id, productId);
      showToast("Đã xóa sản phẩm khỏi bộ sưu tập");
      setCollectionProducts((prev) => prev.filter((p) => p.id !== productId));
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    }
  };

  const filteredProducts = allProducts.filter((p) =>
    !collectionProducts.some((cp) => cp.id === p.id) &&
    (p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
     p.categoryName.toLowerCase().includes(productSearch.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + THÊM BỘ SƯU TẬP
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</div>
        ) : data.length === 0 ? (
          <div className="col-span-full p-6 text-center text-on-surface-variant">Chưa có bộ sưu tập</div>
        ) : (
          data.map((col) => (
            <div key={col.id} className="border border-outline-variant bg-surface p-4 space-y-3 cursor-pointer" onClick={() => openProductModal(col)}>
              <div className="w-full h-36 bg-surface-container-high flex items-center justify-center overflow-hidden">
                {col.bannerImageUrl ? (
                  <img src={col.bannerImageUrl} alt={col.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">collections</span>
                )}
              </div>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-body-md font-bold">{col.name}</h3>
                  <p className="text-body-md text-on-surface-variant">/{col.slug}</p>
                  {col.description && (
                    <p className="text-body-md text-on-surface-variant text-sm mt-1 line-clamp-2">{col.description}</p>
                  )}
                  {col.releaseDate && (
                    <p className="text-body-md text-on-surface-variant text-sm mt-1">
                      Phát hành: {new Date(col.releaseDate).toLocaleDateString("vi-VN")}
                    </p>
                  )}
                </div>
                <span className={`inline-block w-2 h-2 rounded-full mt-2 ${col.isActive ? "bg-secondary" : "bg-error"}`} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-caps text-button-text text-on-surface-variant">{col.productCount} sản phẩm</span>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => openEdit(col)} className="font-label-caps text-button-text border border-primary px-2 py-0.5 hover:bg-primary hover:text-white transition-all">
                    SỬA
                  </button>
                  <button onClick={() => handleDelete(col.id)} className="font-label-caps text-button-text border border-error text-error px-2 py-0.5 hover:bg-error hover:text-white transition-all">
                    XÓA
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal sửa bộ sưu tập */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "SỬA BỘ SƯU TẬP" : "THÊM BỘ SƯU TẬP"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Cập nhật" : "Tạo"}
        submitting={submitting}
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">TÊN BỘ SƯU TẬP</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Nhập tên"
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">SLUG</label>
            <input
              value={form.slug}
              onChange={(e) => { setForm({ ...form, slug: e.target.value }); setSlugManuallyEdited(true); }}
              placeholder="slug-bo-suu-tap"
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">URL HÌNH ẢNH BANNER</label>
          <input
            value={form.bannerImageUrl}
            onChange={(e) => setForm({ ...form, bannerImageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">MÔ TẢ</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="Mô tả về bộ sưu tập..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary resize-y min-h-[60px]"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">NGÀY PHÁT HÀNH</label>
          <input
            type="date"
            value={form.releaseDate}
            onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch checked={form.isActive} onChange={(checked) => setForm({ ...form, isActive: checked })} />
          <span className="font-body-md text-body-md">Kích hoạt</span>
        </div>
      </Modal>

      {/* Modal xem sản phẩm trong bộ sưu tập */}
      <Modal
        open={productModalCollection !== null}
        onClose={() => setProductModalCollection(null)}
        title={`SẢN PHẨM — ${productModalCollection?.name || ""}`}
        onSubmit={openAddProduct}
        submitLabel="+ THÊM SẢN PHẨM"
        submitting={false}
        size="lg"
      >
        {productsLoading ? (
          <div className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải sản phẩm...</div>
        ) : collectionProducts.length === 0 ? (
          <div className="p-6 text-center text-on-surface-variant">Chưa có sản phẩm nào trong bộ sưu tập</div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {collectionProducts.map((p) => (
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
                  <p className="text-body-md text-on-surface-variant text-sm">{p.categoryName} · {formatCurrency(p.minPrice)}</p>
                </div>
                <button
                  onClick={() => handleRemoveProduct(p.id)}
                  className="font-label-caps text-label-caps border border-error text-error px-2 py-0.5 hover:bg-error hover:text-white transition-all shrink-0"
                >
                  XÓA
                </button>
              </div>
            ))}
          </div>
        )}
      </Modal>

      {/* Modal thêm sản phẩm có sẵn */}
      <Modal
        open={addProductModal}
        onClose={() => setAddProductModal(false)}
        title="THÊM SẢN PHẨM VÀO BỘ SƯU TẬP"
        showSubmit={false}
        size="lg"
      >
        <div>
          <input
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Tìm sản phẩm..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary mb-3"
          />
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-center text-on-surface-variant">
                {allProducts.length === 0 ? "Đang tải..." : "Không tìm thấy sản phẩm hoặc tất cả đã thêm"}
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-2 border border-outline-variant/50 hover:bg-surface-container-high transition-colors">
                  {p.thumbnailUrl ? (
                    <img src={p.thumbnailUrl} alt="" className="w-14 h-14 object-cover bg-surface-container-high shrink-0" />
                  ) : (
                    <div className="w-14 h-14 bg-surface-container-high flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-on-surface-variant/30">image</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md font-bold truncate">{p.name}</p>
                    <p className="text-body-md text-on-surface-variant text-sm">{p.categoryName} · {formatCurrency(p.minPrice)}</p>
                  </div>
                  <button
                    onClick={() => handleAddProduct(p.id)}
                    disabled={addingProduct === p.id}
                    className="font-label-caps text-label-caps border border-primary px-2 py-0.5 hover:bg-primary hover:text-white transition-all shrink-0 disabled:opacity-50"
                  >
                    {addingProduct === p.id ? "..." : "THÊM"}
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="border-t border-outline-variant/30 pt-4 mt-3">
            <button
              onClick={() => { setAddProductModal(false); setCreateProductModalOpen(true); }}
              className="w-full font-label-caps text-label-caps bg-primary text-white py-2.5 hover:bg-primary/90 transition-all"
            >
              + THÊM SẢN PHẨM MỚI
            </button>
          </div>
        </div>
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
          onSubmit={async (formData: ProductFormData) => {
            setCreateProductLoading(true);
            try {
              const created = await productsApi.create(formData as any);
              if (productModalCollection) {
                await collectionsApi.addProduct(productModalCollection.id, created.id);
              }
              showToast("Tạo sản phẩm thành công", "success");
              setCreateProductModalOpen(false);
              if (productModalCollection) {
                const products = await collectionsApi.getProducts(productModalCollection.id);
                setCollectionProducts(products);
              }
              fetchData();
            } catch (err: any) {
              showToast(err.message || "Lỗi", "error");
            } finally {
              setCreateProductLoading(false);
            }
          }}
          loading={createProductLoading}
        />
      </Modal>
    </div>
  );
}