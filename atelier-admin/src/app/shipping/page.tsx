"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { shippingProviders, shipping } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import Modal from "@/components/Modal";
import ToggleSwitch from "@/components/ToggleSwitch";
import type { ShippingProviderDto, ShipmentDto } from "@/lib/types";

export default function ShippingPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [providers, setProviders] = useState<ShippingProviderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ShippingProviderDto | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Shipments list
  const [shipments, setShipments] = useState<ShipmentDto[]>([]);
  const [shipLoading, setShipLoading] = useState(true);
  const [shipPage, setShipPage] = useState(1);
  const [shipTotalPages, setShipTotalPages] = useState(1);

  const fetchProviders = () => {
    setLoading(true);
    shippingProviders
      .admin()
      .then((res: any) => setProviders(Array.isArray(res) ? res : res.items))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProviders(); }, []);

  useEffect(() => {
    let cancelled = false;
    setShipLoading(true);
    shipping
      .listAll({ page: shipPage, pageSize: 20 })
      .then((res) => {
        if (!cancelled) {
          setShipments(res.items);
          setShipTotalPages(res.totalPages);
          setShipLoading(false);
        }
      })
      .catch(() => { if (!cancelled) setShipLoading(false); });
    return () => { cancelled = true; };
  }, [shipPage]);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setCode("");
    setIsActive(true);
    setModalOpen(true);
  };

  const openEdit = (p: ShippingProviderDto) => {
    setEditing(p);
    setName(p.name);
    setCode(p.code);
    setIsActive(p.isActive);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) return;
    setSubmitting(true);
    try {
      if (editing) {
        await shippingProviders.update(editing.id, { name: name.trim(), code: code.trim(), isActive });
        showToast("Cập nhật đơn vị vận chuyển thành công", "success");
      } else {
        await shippingProviders.create({ name: name.trim(), code: code.trim() });
        showToast("Tạo đơn vị vận chuyển thành công", "success");
      }
      setModalOpen(false);
      fetchProviders();
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (await confirm("Xóa đơn vị vận chuyển này?")) {
      try {
        await shippingProviders.delete(id);
        showToast("Xóa đơn vị vận chuyển thành công", "success");
        fetchProviders();
      } catch (err: any) {
        showToast(err.message || "Lỗi", "error");
      }
    }
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      Pending: "Chờ xử lý",
      Confirmed: "Đã xác nhận",
      Processing: "Đang xử lý",
      Picking: "Đang lấy hàng",
      Picked: "Đã lấy hàng",
      Shipping: "Đang giao",
      Shipped: "Đã giao",
      Delivered: "Đã nhận",
      Cancelled: "Đã hủy",
    };
    return map[status] || status;
  };

  const providerName = (id: number) =>
    providers.find((p) => p.id === id)?.name || `#${id}`;

  return (
    <div className="space-y-8">
      {/* Đơn vị vận chuyển */}
      <div className="flex justify-end">
        <button onClick={openCreate} className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
          + THÊM ĐƠN VỊ
        </button>
      </div>

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">TÊN</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">MÃ</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">KÍCH HOẠT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : providers.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-6 text-center text-on-surface-variant">Chưa có đơn vị vận chuyển</td>
              </tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="table-row-hover transition-colors">
                  <td className="p-3 font-body-md font-bold">{p.name}</td>
                  <td className="p-3 font-body-md text-center font-mono">{p.code}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${p.isActive ? "bg-secondary" : "bg-error"}`} />
                  </td>
                  <td className="p-3 text-right flex justify-end gap-2">
                    <button onClick={() => openEdit(p)} className="font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all">
                      SỬA
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="font-label-caps text-button-text border border-error text-error px-3 py-1.5 hover:bg-error hover:text-white transition-all">
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
        title={editing ? "SỬA ĐƠN VỊ VẬN CHUYỂN" : "THÊM ĐƠN VỊ VẬN CHUYỂN"}
        onSubmit={handleSubmit}
        submitLabel={editing ? "Cập nhật" : "Tạo"}
        submitting={submitting}
      >
        <div className="space-y-4">
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">TÊN</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ví dụ: GHN, Lalamove..."
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">MÃ</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ví dụ: GHN, LALAMOVE..."
              className="w-full border-b border-outline-variant bg-surface pb-2 font-body-md text-body-md outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-3">
            <ToggleSwitch checked={isActive} onChange={setIsActive} />
            <span className="font-body-md text-body-md">Kích hoạt</span>
          </div>
        </div>
      </Modal>

      {/* Vận đơn */}
      <div>
        <h2 className="font-label-caps text-button-text text-lg mb-3">VẬN ĐƠN</h2>
        <div className="overflow-x-auto border border-outline-variant">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-surface-container-high">
                <th className="p-3 font-label-caps text-button-text font-bold text-center">MÃ ĐƠN</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">ĐƠN VỊ</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">MÃ VẬN ĐƠN</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">TRẠNG THÁI</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">PHÍ VC</th>
                <th className="p-3 font-label-caps text-button-text font-bold text-center">NGÀY TẠO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {shipLoading ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
                </tr>
              ) : shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-on-surface-variant">Không có dữ liệu</td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="table-row-hover transition-colors">
                    <td className="p-3 text-center font-body-md text-body-md">
                      <Link href={`/orders/${s.orderId}`} className="text-secondary hover:underline font-bold">
                        {s.orderCode || `#${s.orderId}`}
                      </Link>
                    </td>
                    <td className="p-3 text-center font-body-md text-body-md">{providerName(s.shippingProviderId)}</td>
                    <td className="p-3 text-center font-mono text-sm">{s.trackingCode || "—"}</td>
                    <td className="p-3 text-center">
                      <span className={`font-label-caps text-button-text px-2 py-0.5 ${
                        s.status === "Delivered"
                          ? "bg-surface-container-high text-on-surface"
                          : s.status === "Cancelled"
                          ? "bg-error text-white"
                          : s.status === "Pending"
                          ? "bg-outline-variant text-on-surface-variant"
                          : "bg-primary text-white"
                      }`}>
                        {statusLabel(s.status)}
                      </span>
                    </td>
                    <td className="p-3 font-body-md text-body-md text-center">
                      {s.shippingFee != null
                        ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(s.shippingFee)
                        : "—"}
                    </td>
                    <td className="p-3 font-body-md text-body-md text-center">
                      {s.createdAt ? new Date(s.createdAt).toLocaleString("vi-VN") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {shipTotalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: shipTotalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setShipPage(p)}
                className={`w-9 h-9 font-label-caps text-label-caps border ${
                  shipPage === p
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