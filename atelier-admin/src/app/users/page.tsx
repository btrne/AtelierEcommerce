"use client";

import { useEffect, useState } from "react";
import { adminUsers } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { UserAdminDto } from "@/lib/types";

export default function UsersPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<UserAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<UserAdminDto | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = () => {
    setLoading(true);
    adminUsers
      .list({ page, pageSize: 15 })
      .then((res) => {
        setData(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

  const openDetail = (user: UserAdminDto) => {
    setSelected(user);
    setModalOpen(true);
  };

  const handleToggleActive = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const updated = await adminUsers.toggleActive(selected.id);
      setSelected({ ...selected, isActive: updated.isActive });
      showToast(updated.message);
      fetchData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Lỗi";
      showToast(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NGƯỜI DÙNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">EMAIL</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SĐT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">ĐƠN HÀNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">TỔNG CHI</th>
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
                <td colSpan={8} className="p-6 text-center text-on-surface-variant">Không có người dùng</td>
              </tr>
            ) : (
              data.map((user) => (
                <tr key={user.id} className="table-row-hover transition-colors">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-surface-container-high flex items-center justify-center font-label-caps text-label-caps">
                        {user.fullName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <span className="font-body-md font-bold">{user.fullName}</span>
                    </div>
                  </td>
                  <td className="p-3 font-body-md text-body-md">{user.email}</td>
                  <td className="p-3 font-body-md">{user.phone || "—"}</td>
                  <td className="p-3 font-body-md">{user.orderCount}</td>
                  <td className="p-3 font-body-md font-bold text-secondary">{formatCurrency(user.totalSpent)}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${user.isActive ? "bg-secondary" : "bg-error"}`} />
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => openDetail(user)} className="font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all">
                      CHI TIẾT
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={"CHI TIẾT NGƯỜI DÙNG"} showSubmit={false} size="md">
        {selected ? (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-surface-container-high flex items-center justify-center font-label-caps text-body-lg text-on-surface-variant">
                {selected.fullName?.charAt(0)?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-body-md font-bold text-lg">{selected.fullName}</p>
                <p className="text-body-md text-on-surface-variant">{selected.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">SỐ ĐIỆN THOẠI</p>
                <p className="font-body-md">{selected.phone || "—"}</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">NGÀY THAM GIA</p>
                <p className="font-body-md">{new Date(selected.createdAt).toLocaleDateString("vi-VN")}</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">ĐƠN HÀNG</p>
                <p className="font-body-md font-bold">{selected.orderCount}</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">TỔNG CHI</p>
                <p className="font-body-md font-bold text-secondary">{formatCurrency(selected.totalSpent)}</p>
              </div>
              <div>
                <p className="font-label-caps text-label-caps text-on-surface-variant">VAI TRÒ</p>
                <p className="font-body-md">{selected.roles?.join(", ") || "—"}</p>
              </div>
              <div className="flex items-end pb-1">
                <span className={`inline-flex items-center gap-2 font-label-caps text-label-caps px-3 py-1.5 border ${
                  selected.isActive
                    ? "border-secondary text-secondary"
                    : "border-error text-error"
                }`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${selected.isActive ? "bg-secondary" : "bg-error"}`} />
                  {selected.isActive ? "ĐANG HOẠT ĐỘNG" : "ĐÃ VÔ HIỆU"}
                </span>
              </div>
            </div>
            <div className="flex gap-3 pt-2 border-t border-outline-variant/30">
              <button
                onClick={handleToggleActive}
                disabled={submitting}
                className={`flex-1 py-3 font-label-caps text-label-caps uppercase tracking-widest transition-colors ${
                  selected.isActive
                    ? "border border-error text-error hover:bg-error hover:text-white"
                    : "bg-primary text-white hover:bg-primary/90"
                }`}
              >
                {submitting ? "..." : selected.isActive ? "VÔ HIỆU" : "KÍCH HOẠT"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
