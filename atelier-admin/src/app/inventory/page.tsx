"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { inventory as inventoryApi, products as productsApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { InventoryTransactionDto, ProductVariantOptionDto } from "@/lib/types";

const typeLabel: Record<string, string> = {
  import: "NHẬP KHO",
  export: "XUẤT KHO",
  adjustment: "ĐIỀU CHỈNH",
  return: "TRẢ HÀNG",
};

const typeClass: Record<string, string> = {
  import: "bg-surface-container-high text-on-surface",
  export: "bg-surface-container-high text-on-surface",
  adjustment: "bg-surface-container-high text-on-surface",
  return: "bg-surface-container-high text-on-surface",
};

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-4 animate-pulse">Đang tải...</div>}>
      <InventoryContent />
    </Suspense>
  );
}

function InventoryContent() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const [data, setData] = useState<InventoryTransactionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [variants, setVariants] = useState<ProductVariantOptionDto[]>([]);
  const [lowStock, setLowStock] = useState<ProductVariantOptionDto[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ productVariantId: 0, transactionType: "Import", quantity: 0, note: "" });

  const fetchVariants = async () => {
    try {
      const res = await productsApi.variants();
      const list = Array.isArray(res) ? res : [];
      setVariants(list);
      setLowStock(list.filter((v) => v.quantity >= 0).sort((a, b) => a.quantity - b.quantity).slice(0, 5));
    } catch { setVariants([]); setLowStock([]); }
  };

  const getThumbnail = (variantId: number): string | null => {
    const v = variants.find((x) => x.id === variantId);
    return v?.thumbnailUrl || null;
  };

  const fetchData = () => {
    setLoading(true);
    inventoryApi
      .admin({ page, pageSize: 15 })
      .then((res) => {
        setData(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); fetchVariants(); }, [page]);

  useEffect(() => {
    const variantId = searchParams.get("variantId");
    if (variantId) {
      openCreate(Number(variantId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openCreate = async (variantId?: number) => {
    setForm({ productVariantId: variantId || 0, transactionType: "Import", quantity: 0, note: "" });
    await fetchVariants();
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.productVariantId || form.quantity <= 0) return;
    setSubmitting(true);
    try {
      await inventoryApi.create(form);
      showToast("Tạo giao dịch thành công", "success");
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={() => openCreate()} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + NHẬP KHO
        </button>
      </div>

      {lowStock.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-label-caps text-label-caps text-primary border-b-2 border-secondary pb-2">
            TỒN KHO THẤP (5 SẢN PHẨM)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {lowStock.map((v) => (
              <button
                key={v.id}
                onClick={() => openCreate(v.id)}
                className="border border-outline-variant p-3 text-left hover:border-primary transition-all space-y-1"
              >
                <p className="font-body-md font-bold truncate">{v.productName}</p>
                <p className="text-body-md text-on-surface-variant truncate">{v.sku}</p>
                <p className="font-body-md text-error">{v.quantity} sản phẩm</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SẢN PHẨM</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SKU</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">LOẠI</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SỐ LƯỢNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">GHI CHÚ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NGÀY</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-on-surface-variant">Không có giao dịch</td>
              </tr>
            ) : (
              data.map((t) => (
                <tr key={t.id} className="table-row-hover transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-container-high flex items-center justify-center overflow-hidden shrink-0">
                        {(() => {
                          const thumb = getThumbnail(t.productVariantId);
                          if (thumb) return <img src={thumb} alt="" className="w-full h-full object-cover" />;
                          return <span className="material-symbols-outlined text-on-surface-variant/30 text-sm">inventory_2</span>;
                        })()}
                      </div>
                      <span className="font-body-md">{t.productName || "—"}</span>
                    </div>
                  </td>
                  <td className="text-center p-3 font-body-md text-body-md text-on-surface-variant">{t.variantSku || "—"}</td>
                  <td className="text-center p-3">
                    <span className={`text-center bg-surface-container-high font-label-caps text-label-caps px-2 py-0.5 ${typeClass[t.transactionType] || ""}`}>
                      {typeLabel[t.transactionType.toLowerCase()] || t.transactionType}
                    </span>
                  </td>
                  <td className="text-center p-3 font-body-md font-bold">{t.quantity}</td>
                  <td className="text-center p-3 font-body-md text-body-md text-on-surface-variant">{t.note || "—"}</td>
                  <td className="text-center p-3 font-body-md text-body-md text-on-surface-variant">
                    {new Date(t.createdAt).toLocaleDateString("vi-VN")}
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
        title="NHẬP KHO"
        onSubmit={handleSubmit}
        submitLabel="Tạo"
        submitting={submitting}
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">SẢN PHẨM</label>
          <select
            value={form.productVariantId}
            onChange={(e) => setForm({ ...form, productVariantId: Number(e.target.value) })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          >
            <option value={0}>Chọn sản phẩm...</option>
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.productName} — {v.sku} ({v.attributeSummary || "Mặc định"})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">LOẠI GIAO DỊCH</label>
          <select
            value={form.transactionType}
            onChange={(e) => setForm({ ...form, transactionType: e.target.value })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          >
            {Object.entries(typeLabel).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">SỐ LƯỢNG</label>
          <input
            type="number"
            value={form.quantity || ""}
            onChange={(e) => setForm({ ...form, quantity: e.target.value ? Number(e.target.value) : 0 })}
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">GHI CHÚ</label>
          <input
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Nhập ghi chú (không bắt buộc)"
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
      </Modal>
    </div>
  );
}
