"use client";

import { useEffect, useState } from "react";
import { vouchers as vouchersApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ToggleSwitch from "@/components/ToggleSwitch";
import type { VoucherAdminDto } from "@/lib/types";

const toDateInput = (iso: string) => iso ? iso.substring(0, 10) : "";

export default function VouchersPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<VoucherAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<VoucherAdminDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    code: "", description: "", discountType: "Percentage", discountValue: 0,
    minOrderValue: 0, maxDiscountValue: 0, maxUses: 100, maxUsesPerUser: 1,
    startDate: "", endDate: "", isActive: true,
  });

  useEffect(() => {
    setLoading(true);
    vouchersApi
      .admin({ page, pageSize: 15 })
      .then((res) => {
        setData(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page]);

  const fetchData = () => {
    setLoading(true);
    vouchersApi
      .admin({ page, pageSize: 15 })
      .then((res) => {
        setData(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

  const openCreate = () => {
    setEditing(null);
    setForm({
      code: "", description: "", discountType: "Percentage", discountValue: 0,
      minOrderValue: 0, maxDiscountValue: 0, maxUses: 100, maxUsesPerUser: 1,
      startDate: "", endDate: "", isActive: true,
    });
    setModalOpen(true);
  };

  const openEdit = (v: VoucherAdminDto) => {
    setEditing(v);
    setForm({
      code: v.code, description: v.description || "", discountType: v.discountType,
      discountValue: v.discountValue, minOrderValue: v.minOrderValue,
      maxDiscountValue: v.maxDiscountValue, maxUses: v.maxUses, maxUsesPerUser: v.maxUsesPerUser,
      startDate: toDateInput(v.startDate), endDate: toDateInput(v.endDate), isActive: v.isActive,
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        description: form.description || undefined,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      if (editing) {
        await vouchersApi.update(editing.id, payload);
        showToast("Cập nhật voucher thành công", "success");
      } else {
        await vouchersApi.create(payload);
        showToast("Tạo voucher thành công", "success");
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
    if (await confirm("Xóa voucher này?")) {
      try {
        await vouchersApi.delete(id);
        showToast("Xóa voucher thành công", "success");
        fetchData();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Lỗi";
        showToast(message);
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + TẠO VOUCHER
        </button>
      </div>

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">MÃ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">MÔ TẢ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">GIẢM</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">ĐƠN TỐI THIỂU</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">ĐÃ DÙNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">HẠN</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">KÍCH HOẠT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-on-surface-variant">Chưa có voucher</td>
              </tr>
            ) : (
              data.map((v) => (
                <tr key={v.id} className="table-row-hover transition-colors">
                  <td className="p-3 font-body-md font-bold text-secondary">{v.code}</td>
                  <td className="p-3 font-body-md text-body-md text-on-surface-variant max-w-50 truncate">{v.description || "—"}</td>
                  <td className="p-3 font-body-md font-bold">
                    {v.discountType === "Percentage" ? `${v.discountValue}%` : formatCurrency(v.discountValue)}
                  </td>
                  <td className="p-3 font-body-md">{formatCurrency(v.minOrderValue)}</td>
                  <td className="p-3 font-body-md">{v.currentUses}/{v.maxUses}</td>
                  <td className="p-3 font-body-md text-body-md text-on-surface-variant">
                    {new Date(v.endDate).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${v.isActive ? "bg-secondary" : "bg-error"}`} />
                  </td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => openEdit(v)} className="font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all">
                      SỬA
                    </button>
                    <button onClick={() => handleDelete(v.id)} className="font-label-caps text-button-text border border-error text-error px-3 py-1.5 hover:bg-error hover:text-white transition-all">
                      XÓA
                    </button>
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
        title={editing ? "SỬA VOUCHER" : "TẠO VOUCHER"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Cập nhật" : "Tạo"}
        submitting={submitting}
      >
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">MÃ VOUCHER</label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="SUMMER2024"
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">LOẠI GIẢM</label>
            <select
              value={form.discountType}
              onChange={(e) => setForm({ ...form, discountType: e.target.value })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            >
              <option value="Percentage">Phần trăm</option>
              <option value="Fixed">Số tiền</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">MÔ TẢ</label>
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Giảm mùa hè..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">GIÁ TRỊ GIẢM</label>
            <input
              type="number"
              value={form.discountValue || ""}
              onChange={(e) => setForm({ ...form, discountValue: e.target.value ? Number(e.target.value) : 0 })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">GIẢM TỐI ĐA</label>
            <input
              type="number"
              value={form.maxDiscountValue || ""}
              onChange={(e) => setForm({ ...form, maxDiscountValue: e.target.value ? Number(e.target.value) : 0 })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">ĐƠN TỐI THIỂU</label>
            <input
              type="number"
              value={form.minOrderValue || ""}
              onChange={(e) => setForm({ ...form, minOrderValue: e.target.value ? Number(e.target.value) : 0 })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">SỐ LƯỢNG</label>
            <input
              type="number"
              value={form.maxUses || ""}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value ? Number(e.target.value) : 0 })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">DÙNG / NGƯỜI</label>
            <input
              type="number"
              value={form.maxUsesPerUser || ""}
              onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value ? Number(e.target.value) : 0 })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-end pb-2">
            <div className="flex items-center gap-3">
              <ToggleSwitch checked={form.isActive} onChange={(checked) => setForm({ ...form, isActive: checked })} />
              <span className="font-body-md text-body-md">Kích hoạt</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">NGÀY BẮT ĐẦU</label>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">NGÀY KẾT THÚC</label>
            <input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
