"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { products as productsApi, categories } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ProductForm, { type ProductFormData } from "@/components/ProductForm";
import type { ProductAdminDto, ProductDetailAdminDto, CategoryAdminDto } from "@/lib/types";
import Link from "next/link";

export default function ProductsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const router = useRouter();
  const [data, setData] = useState<ProductAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [catList, setCatList] = useState<CategoryAdminDto[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<number | "">("");
  const [activeFilter, setActiveFilter] = useState<boolean | "">("");
  const [featuredFilter, setFeaturedFilter] = useState<boolean | "">("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductAdminDto | null>(null);
  const [editingDetail, setEditingDetail] = useState<ProductDetailAdminDto | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    productsApi
      .admin({
        page,
        pageSize: 15,
        search: search || undefined,
        categoryId: categoryFilter !== "" ? Number(categoryFilter) : undefined,
        isActive: activeFilter !== "" ? Boolean(activeFilter) : undefined,
        isFeatured: featuredFilter !== "" ? Boolean(featuredFilter) : undefined,
      })
      .then((res) => {
        setData(res.items);
        setTotalPages(res.totalPages);
        setTotalCount(res.totalCount);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, search, categoryFilter, activeFilter, featuredFilter]);

  useEffect(() => {
    categories.admin().then(setCatList).catch(() => {});
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const openCreate = () => {
    setEditingProduct(null);
    setEditingDetail(null);
    setModalOpen(true);
  };

  const openEdit = async (product: ProductAdminDto) => {
    setEditingProduct(product);
    try {
      const detail = await productsApi.adminDetail(product.id);
      setEditingDetail(detail);
    } catch {
      setEditingDetail(null);
    }
    setModalOpen(true);
  };

  const handleFormSubmit = async (formData: ProductFormData) => {
    setProductLoading(true);
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData as any);
        showToast("Cập nhật sản phẩm thành công", "success");
      } else {
        const created = await productsApi.create(formData as any);
        showToast("Tạo sản phẩm thành công", "success");
        router.push(`/products/${created.id}`);
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setProductLoading(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!await confirm(`Xóa sản phẩm "${name}"?`)) return;
    setDeleting(id);
    try {
      await productsApi.delete(id);
      showToast("Xóa sản phẩm thành công", "success");
      fetchProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      showToast(msg);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm sản phẩm..."
            className="border border-outline-variant bg-surface font-body-md text-body-md px-3 py-2 outline-none focus:border-primary w-72"
          />
          <button type="submit" className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
            TÌM
          </button>
        </form>
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90 text-center">
          + THÊM SẢN PHẨM
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select
          value={String(categoryFilter)}
          onChange={(e) => { const v = e.target.value; setCategoryFilter(v === "" ? "" : Number(v)); setPage(1); }}
          className="border border-outline-variant bg-surface font-label-caps text-button-text px-2 py-1.5 outline-none focus:border-primary"
        >
          <option value="">Tất cả danh mục</option>
          {catList.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={String(activeFilter)}
          onChange={(e) => { const v = e.target.value; setActiveFilter(v === "" ? "" : v === "true"); setPage(1); }}
          className="border border-outline-variant bg-surface font-label-caps text-button-text px-2 py-1.5 outline-none focus:border-primary"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang bán</option>
          <option value="false">Ngừng bán</option>
        </select>
        <select
          value={String(featuredFilter)}
          onChange={(e) => { const v = e.target.value; setFeaturedFilter(v === "" ? "" : v === "true"); setPage(1); }}
          className="border border-outline-variant bg-surface font-label-caps text-button-text px-2 py-1.5 outline-none focus:border-primary"
        >
          <option value="">Tất cả</option>
          <option value="true">Nổi bật</option>
          <option value="false">Không nổi bật</option>
        </select>
      </div>

      <p className="font-body-md text-body-md text-on-surface-variant">
        Hiển thị {data.length}/{totalCount} sản phẩm
      </p>

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SẢN PHẨM</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">DANH MỤC</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">GIÁ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">TỒN KHO</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NỔI BẬT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">KÍCH HOẠT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-on-surface-variant">Không có sản phẩm</td>
              </tr>
            ) : (
              data.map((product) => (
                <tr key={product.id} className="table-row-hover transition-colors">
                  <td className="p-3">
                    <Link href={`/products/${product.id}`} className="flex items-center gap-3 hover:text-secondary">
                      <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center overflow-hidden">
                        {product.thumbnailUrl ? (
                          <img src={product.thumbnailUrl} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant/30">inventory_2</span>
                        )}
                      </div>
                      <div>
                        <p className="font-body-md">{product.name}</p>
                        <p className="text-button-text text-on-surface-variant">{product.variantCount} biến thể</p>
                      </div>
                    </Link>
                  </td>
                  <td className="p-3 font-body-md text-body-md">{product.categoryName}</td>
                  <td className="p-3 font-body-md text-secondary">{formatCurrency(product.minPrice)}</td>
                  <td className="p-3 font-body-md">{product.totalStock}</td>
                  <td className="p-3 text-center">
                    <span className={`font-label-caps text-label-caps px-2 py-0.5 ${product.isFeatured ? "bg-surface-container-high text-on-surface" : "bg-surface-container-high text-on-surface-variant"}`}>
                      {product.isFeatured ? "NỔI BẬT" : "—"}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${product.isActive ? "bg-secondary" : "bg-error"}`} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(product)}
                        className="font-label-caps text-button-text border border-primary px-2 py-1 hover:bg-primary hover:text-white transition-all"
                      >
                        SỬA
                      </button>
                      <button
                        onClick={() => handleDelete(product.id, product.name)}
                        disabled={deleting === product.id}
                        className="font-label-caps text-button-text border border-error text-error px-2 py-1 hover:bg-error hover:text-white transition-all disabled:opacity-50"
                      >
                        {deleting === product.id ? "..." : "XOÁ"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-9 h-9 font-label-caps text-label-caps border ${
                page === p
                  ? "bg-primary text-white border-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? "SỬA SẢN PHẨM" : "THÊM SẢN PHẨM"}
        onSubmit={() => formRef.current?.requestSubmit()}
        submitLabel={editingProduct ? "Cập nhật" : "Tạo"}
        submitting={productLoading}
        size="lg"
      >
        <ProductForm
          formRef={formRef}
          hideSubmitButton
          initialData={editingDetail ? {
            name: editingDetail.name,
            slug: editingDetail.slug || "",
            shortDescription: editingDetail.shortDescription || "",
            description: editingDetail.description || "",
            categoryId: editingDetail.categoryId,
            isFeatured: editingDetail.isFeatured,
            isPreorder: editingDetail.isPreorder,
            isActive: editingDetail.isActive,
            collectionIds: editingDetail.collectionIds || [],
          } : editingProduct ? {
            name: editingProduct.name,
            slug: editingProduct.slug || "",
            categoryId: editingProduct.categoryId,
            isFeatured: editingProduct.isFeatured,
            isActive: editingProduct.isActive,
          } : undefined}
          onSubmit={handleFormSubmit}
          loading={productLoading}
        />
      </Modal>
    </div>
  );
}
