"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { paymentMethods, orders as ordersApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ToggleSwitch from "@/components/ToggleSwitch";
import type { PaymentMethodDto, OrderAdminDto } from "@/lib/types";

export default function PaymentsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<PaymentMethodDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  const fetchData = () => {
    setLoading(true);
    paymentMethods
      .admin()
      .then((res: any) => setData(Array.isArray(res) ? res : res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (pm: PaymentMethodDto) => {
    setEditing(pm);
    setName(pm.name);
    setIsActive(pm.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await paymentMethods.update(editing.id, { name: name.trim(), isActive });
        showToast("Cập nhật phương thức thanh toán thành công", "success");
      } else {
        await paymentMethods.create({ name: name.trim() });
        showToast("Tạo phương thức thanh toán thành công", "success");
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
    if (await confirm("Xóa phương thức thanh toán này?")) {
      try {
        await paymentMethods.delete(id);
        showToast("Xóa phương thức thanh toán thành công", "success");
        fetchData();
      } catch (err: any) {
        showToast(err.message || "Lỗi", "error");
      }
    }
  };

  // Orders payment data
  const [orderData, setOrderData] = useState<OrderAdminDto[]>([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotalPages, setOrderTotalPages] = useState(1);

  useEffect(() => {
    let cancelled = false;
    ordersApi
      .admin({ page: orderPage, pageSize: 20 })
      .then((res) => {
        if (!cancelled) {
          setOrderData(res.items);
          setOrderTotalPages(res.totalPages);
          setOrderLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setOrderLoading(false); });
    return () => { cancelled = true; };
  }, [orderPage]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + THÊM PHƯƠNG THỨC
        </button>
      </div>

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">PHƯƠNG THỨC</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">KÍCH HOẠT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-6 text-center text-on-surface-variant">Chưa có phương thức thanh toán</td>
              </tr>
            ) : (
              data.map((pm) => (
                <tr key={pm.id} className="table-row-hover transition-colors">
                  <td className="p-3 font-body-md font-bold">{pm.name}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${pm.isActive ? "bg-secondary" : "bg-error"}`} />
                  </td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => openEdit(pm)} className="font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all">
                      SỬA
                    </button>
                    <button onClick={() => handleDelete(pm.id)} className="font-label-caps text-button-text border border-error text-error px-3 py-1.5 hover:bg-error hover:text-white transition-all">
                      XÓA
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "SỬA PHƯƠNG THỨC" : "THÊM PHƯƠNG THỨC"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Cập nhật" : "Tạo"}
        submitting={submitting}
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">TÊN PHƯƠNG THỨC</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ví dụ: Chuyển khoản, Ví điện tử..."
            className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-3">
          <ToggleSwitch checked={isActive} onChange={setIsActive} />
          <span className="font-body-md text-body-md">Kích hoạt</span>
        </div>
      </Modal>

      {/* Bảng thanh toán */}
      <div>
        <h2 className="font-label-caps text-button-text text-lg mb-3">THANH TOÁN</h2>
        <div className="overflow-x-auto border border-outline-variant">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="p-3 font-label-caps text-button-text font-bold text-center">MÃ ĐƠN</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">PHƯƠNG THỨC</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">TRẠNG THÁI</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">SỐ TIỀN</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">THỜI GIAN TT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {orderLoading ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
                </tr>
              ) : orderData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-on-surface-variant">Không có dữ liệu</td>
                </tr>
              ) : (
                orderData.map((order) => (
                  <tr key={order.id} className="table-row-hover transition-colors">
                    <td className="p-3 font-body-md text-body-md text-center">
                      <Link href={`/orders/${order.id}`} className="text-secondary hover:underline font-bold">
                        {order.orderCode}
                      </Link>
                    </td>
                    <td className="p-3 font-body-md text-body-md text-center">{order.paymentMethodName || "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`font-label-caps text-button-text px-2 py-0.5 ${
                        order.paymentStatus === "Completed"
                          ? "bg-surface-container-high text-on-surface"
                          : order.paymentStatus === "Pending"
                          ? "bg-primary text-white"
                          : "bg-outline-variant text-on-surface-variant"
                      }`}>
                        {order.paymentStatus === "Completed" ? "ĐÃ THANH TOÁN" : order.paymentStatus === "Pending" ? "CHỜ THANH TOÁN" : order.paymentStatus === "Failed" ? "THẤT BẠI" : "CHƯA CÓ"}
                      </span>
                    </td>
                    <td className="p-3 font-body-md text-body-md text-center">{formatCurrency(order.totalAmount)}</td>
                    <td className="p-3 font-body-md text-body-md text-center">
                      {order.paidAt ? new Date(order.paidAt).toLocaleString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {orderTotalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: orderTotalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setOrderPage(p)}
                className={`w-9 h-9 font-label-caps text-label-caps border ${
                  orderPage === p
                    ? "bg-primary text-white border-primary"
                    : "border-outline-variant text-on-surface-variant hover:border-primary"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
