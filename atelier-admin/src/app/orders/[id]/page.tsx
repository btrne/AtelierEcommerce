"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { orders as ordersApi, shipping as shippingApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Modal from "@/components/Modal";
import type { OrderDetailAdminDto, ShippingProviderDto, ShipmentDto } from "@/lib/types";

const statusFlow = ["Pending", "Confirmed", "Processing", "Shipping", "Completed"];

const statusLabel: Record<string, string> = {
  Pending: "CHỜ XỬ LÝ",
  Confirmed: "ĐÃ XÁC NHẬN",
  Processing: "ĐANG XỬ LÝ",
  Shipping: "ĐANG GIAO",
  Completed: "HOÀN THÀNH",
  Cancelled: "ĐÃ HUỶ",
};

const shipmentStatusLabel: Record<string, string> = {
  Pending: "Chờ lấy",
  Shipping: "Đang giao",
  Shipped: "Đã lấy hàng",
  Delivered: "Đã giao",
  Cancelled: "Đã huỷ",
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const [detail, setDetail] = useState<OrderDetailAdminDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [providers, setProviders] = useState<ShippingProviderDto[]>([]);
  const [shipments, setShipments] = useState<ShipmentDto[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<number>(0);
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [shipModalOpen, setShipModalOpen] = useState(false);
  const [checkingShipmentId, setCheckingShipmentId] = useState<number | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      try {
        const res = await ordersApi.adminDetail(Number(params.id));
        setDetail(res);
      } catch (err: any) {
        showToast(err.message || "Lỗi tải chi tiết đơn hàng", "error");
        router.push("/orders");
      } finally {
        setLoading(false);
      }
    };
    if (params.id) fetchDetail();
  }, [params.id]);

  useEffect(() => {
    if (!params.id) return;
    shippingApi.providers().then(setProviders).catch(() => {});
    shippingApi.list(Number(params.id)).then(setShipments).catch(() => {});
  }, [params.id]);

  const handleUpdateStatus = async (status: string) => {
    if (!detail || status === detail.orderStatus) return;
    setUpdating(true);
    try {
      await ordersApi.updateStatus(detail.id, status);
      const refreshed = await ordersApi.adminDetail(detail.id);
      setDetail(refreshed);
      const refreshedShipments = await shippingApi.list(Number(params.id));
      setShipments(refreshedShipments);
      showToast("Cập nhật trạng thái đơn hàng thành công", "success");
    } catch (err: any) {
      showToast(err.message || "Lỗi", "error");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    if (shipModalOpen && detail?.preferredCarrierCode && providers.length > 0) {
      const matched = providers.find(
        (p) => p.code?.toLowerCase() === detail.preferredCarrierCode!.toLowerCase()
      );
      if (matched) setSelectedProviderId(matched.id);
    }
  }, [shipModalOpen, detail?.preferredCarrierCode, providers]);

  const handleCreateShipment = async () => {
    if (!selectedProviderId) { showToast("Vui lòng chọn đơn vị vận chuyển", "warning"); return; }
    setCreatingShipment(true);
    try {
      await shippingApi.create(Number(params.id), {
        shippingProviderId: selectedProviderId,
      });
      showToast("Tạo vận đơn thành công", "success");
      setShipModalOpen(false);
      setSelectedProviderId(0);
      if (!detail) return;
      const refreshedDetail = await ordersApi.adminDetail(detail.id);
      setDetail(refreshedDetail);
      const refreshedShipments = await shippingApi.list(Number(params.id));
      setShipments(refreshedShipments);
    } catch (err: any) {
      showToast(err.message || "Lỗi tạo vận đơn", "error");
    } finally {
      setCreatingShipment(false);
    }
  };

  const handleCheckStatus = async (shipmentId: number) => {
    setCheckingShipmentId(shipmentId);
    try {
      await shippingApi.checkStatus(shipmentId);
      if (!detail) return;
      const refreshedDetail = await ordersApi.adminDetail(detail.id);
      setDetail(refreshedDetail);
      const refreshed = await shippingApi.list(Number(params.id));
      setShipments(refreshed);
      showToast("Cập nhật trạng thái thành công", "success");
    } catch (err: any) {
      showToast(err.message || "Lỗi kiểm tra trạng thái", "error");
    } finally {
      setCheckingShipmentId(null);
    }
  };

  const currentIndex = statusFlow.indexOf(detail?.orderStatus || "");
  const isCancelled = detail?.orderStatus === "Cancelled";
  const canCreateShipment = detail && detail.orderStatus === "Processing";
  const canCheckStatus = shipments.length > 0 && shipments.some(s => s.trackingCode);

  if (loading) {
    return <div className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</div>;
  }

  if (!detail) return null;

  const latestPayment = detail.payments?.[0] ?? null;
  const paymentStatus = latestPayment?.status === "Completed" ? "ĐÃ THANH TOÁN" : latestPayment?.status === "Pending" ? "CHỜ THANH TOÁN" : latestPayment?.status === "Failed" ? "THẤT BẠI" : "CHƯA THANH TOÁN";
  const paymentStatusClass = latestPayment?.status === "Completed" ? "bg-surface-container-high text-on-surface" : latestPayment?.status === "Pending" ? "bg-primary text-white" : "bg-outline-variant text-on-surface-variant";

  const timeline = (() => {
    const entries: { id: string; createdAt: string; type: "order" | "shipment"; label: string; description: string | null }[] = [];

    for (const log of detail.orderLogs || []) {
      entries.push({
        id: `order-${log.id}`,
        createdAt: log.createdAt,
        type: "order" as const,
        label: statusLabel[log.toStatus] || log.toStatus,
        description: log.note,
      });
    }

    for (const s of shipments) {
      for (const log of s.trackingLogs || []) {
        entries.push({
          id: `shipment-${log.id}`,
          createdAt: log.createdAt,
          type: "shipment" as const,
          label: shipmentStatusLabel[log.status] || log.status,
          description: log.description,
        });
      }
    }

    entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return entries;
  })();

  return (
    <div className="space-y-6 px-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-on-surface-variant hover:text-primary transition-colors font-label-caps text-label-caps">
        <span className="material-symbols-outlined">arrow_back</span>
        QUAY LẠI
      </button>

      <h2 className="font-headline-md text-headline-md text-primary">CHI TIẾT ĐƠN HÀNG</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant">KHÁCH HÀNG</p>
          <p className="font-body-md font-bold">{detail.customerName || detail.shippingContactName}</p>
          <p className="text-body-md text-on-surface-variant">{detail.customerEmail}</p>
          <p className="text-body-md text-on-surface-variant">{detail.shippingPhone}</p>
        </div>
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant">ĐƠN HÀNG</p>
          <p className="font-body-md font-bold">{detail.orderCode}</p>
          <p className="text-body-md text-on-surface-variant">Ngày tạo: {new Date(detail.createdAt).toLocaleString("vi-VN")}</p>
        </div>
        <div className="md:col-span-2">
          <p className="font-label-caps text-label-caps text-on-surface-variant">ĐỊA CHỈ GIAO HÀNG</p>
          <p className="font-body-md">{detail.shippingDetail}, {detail.shippingWard}, {detail.shippingDistrict}, {detail.shippingProvince}</p>
        </div>
      </div>

      <div className="border-t border-outline-variant/30 pt-6">
        <p className="font-label-caps text-label-caps text-on-surface-variant mb-4">TRẠNG THÁI ĐƠN HÀNG</p>
        <div className="flex items-center gap-1 mb-4">
          {statusFlow.map((s, i) => {
            const isActive = i <= currentIndex;
            const isCurrent = i === currentIndex;
            return (
              <div key={s} className="flex items-center flex-1">
                <button
                  onClick={() => handleUpdateStatus(s)}
                  disabled={updating || isCurrent || isCancelled || i > currentIndex + 1}
                  className={`flex-1 py-2.5 font-label-caps text-label-caps text-center border transition-all disabled:cursor-not-allowed ${
                    isCurrent
                      ? "bg-primary text-white border-primary"
                      : isActive
                        ? "bg-surface-container-high text-on-surface border-outline-variant"
                        : "bg-surface text-on-surface-variant border-outline-variant hover:border-primary"
                  }`}
                >
                  {statusLabel[s]}
                </button>
                {i < statusFlow.length - 1 && (
                  <div className={`w-4 h-px ${i < currentIndex ? "bg-primary" : "bg-outline-variant"}`} />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex gap-3 items-center">
          {!isCancelled ? (
            <button
              onClick={() => handleUpdateStatus("Cancelled")}
              disabled={updating}
              className="font-label-caps text-label-caps px-4 py-2 border border-error text-error hover:bg-error hover:text-white transition-all disabled:opacity-50"
            >
              HUỶ ĐƠN
            </button>
          ) : (
            <span className="font-label-caps text-button-text px-3 py-1.5 bg-error text-white">ĐÃ HUỶ</span>
          )}
          {updating && <span className="text-on-surface-variant font-label-caps text-label-caps animate-pulse">Đang cập nhật...</span>}
        </div>
      </div>

      <div>
        <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">SẢN PHẨM</p>
        <div className="border border-outline-variant divide-y divide-outline-variant/30">
          {detail.items && detail.items.length > 0 ? (
            detail.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3">
                {item.imageUrl && (
                  <img src={item.imageUrl} alt="" className="w-14 h-14 object-cover bg-surface-container-high" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-body-md font-bold truncate">{item.productName}</p>
                  <p className="text-body-md text-on-surface-variant">{item.variantName}</p>
                </div>
                <div className="text-right">
                  <p className="font-body-md">{formatCurrency(item.unitPrice)}</p>
                  <p className="text-body-md text-on-surface-variant">x{item.quantity}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-on-surface-variant">Không có sản phẩm</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">THANH TOÁN</p>
          <div className="border border-outline-variant divide-y divide-outline-variant/30 bg-white">
            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-body-md">Phương thức:</span>
                <span className="font-body-md font-bold">{detail.paymentMethodName || "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-body-md">Trạng thái:</span>
                <span className={`font-label-caps text-button-text px-2 py-0.5 ${paymentStatusClass}`}>
                  {paymentStatus}
                </span>
              </div>
            </div>
            {(detail.payments?.length ?? 0) > 0 && (
              <div className="divide-y divide-outline-variant/30">
                {detail.payments!.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 text-body-md">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px]">receipt</span>
                      <span className="truncate">{p.transactionCode || "—"}</span>
                      <span className={`font-label-caps text-button-text px-1.5 py-0.5 text-[11px] ${
                        p.status === "Completed" ? "bg-surface-container-high text-on-surface" :
                        p.status === "Pending" ? "bg-primary text-white" :
                        "bg-outline-variant text-on-surface-variant"
                      }`}>
                        {p.status === "Completed" ? "Đã TT" : p.status === "Pending" ? "Chờ" : "Lỗi"}
                      </span>
                    </div>
                    <span className="font-medium">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant mb-2">CHI TIẾT TIỀN</p>
          <div className="border border-outline-variant p-4 space-y-2 bg-white">
            <div className="flex justify-between items-center">
              <span className="font-body-md text-on-surface-variant">Tạm tính</span>
              <span className="font-body-md">{formatCurrency(detail.subtotalAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body-md text-on-surface-variant">Phí ship</span>
              <span className="font-body-md">{formatCurrency(detail.shippingFee)}</span>
            </div>
            {detail.voucherDiscount ? (
              <div className="flex justify-between items-center">
                <span className="font-body-md text-on-surface-variant">Giảm</span>
                <span className="font-body-md text-error">-{formatCurrency(detail.voucherDiscount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
              <span className="font-body-md font-bold">Tổng cộng</span>
              <span className="font-body-md font-bold text-secondary text-lg">{formatCurrency(detail.totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal tạo vận đơn */}
      <Modal
        open={shipModalOpen}
        onClose={() => setShipModalOpen(false)}
        title="TẠO VẬN ĐƠN"
        onSubmit={handleCreateShipment}
        submitLabel="TẠO"
        submitting={creatingShipment}
        size="md"
      >
        <div>
          <label className="block font-label-caps text-label-caps text-on-surface-variant mb-1">Đơn vị vận chuyển</label>
          <select
            value={selectedProviderId}
            onChange={(e) => setSelectedProviderId(Number(e.target.value))}
            className="w-full border border-outline-variant p-2.5 font-body-md text-body-md bg-white focus:outline-none focus:border-primary"
          >
            <option value={0}>Chọn đơn vị vận chuyển...</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Dòng thời gian */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-label-caps text-label-caps text-on-surface-variant">DÒNG THỜI GIAN</p>
          <div className="flex items-center gap-2">
            {detail.preferredCarrierCode && (
              <span className="text-body-md text-on-surface-variant">
                {detail.preferredCarrierCode === "Lalamove" ? "Giao nhanh" : "Giao chuẩn"}
                <span className="material-symbols-outlined align-middle text-[14px] mx-0.5">chevron_right</span>
              </span>
            )}
            {shipments.map(s => s.trackingCode).filter(Boolean).length > 0 && (
              <span className="text-body-md text-on-surface-variant">
                Mã: {shipments.filter(s => s.trackingCode).map(s => s.trackingCode).join(", ")}
              </span>
            )}
            {canCheckStatus && (
              <span className="flex gap-1">
                {shipments.filter(s => s.trackingCode).map(s => (
                  <button
                    key={s.id}
                    onClick={() => handleCheckStatus(s.id)}
                    disabled={checkingShipmentId === s.id}
                    className="flex items-center gap-1 font-label-caps text-label-caps px-3 py-1.5 border border-primary text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    {checkingShipmentId === s.id ? "Đang cập nhật..." : "Cập nhật"}
                  </button>
                ))}
              </span>
            )}
            {canCreateShipment && (
              <button
                onClick={() => setShipModalOpen(true)}
                className="flex items-center gap-1 font-label-caps text-label-caps px-3 py-1.5 bg-secondary text-white hover:opacity-90 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                TẠO VẬN ĐƠN
              </button>
            )}
          </div>
        </div>

        <div className="border border-outline-variant p-4 bg-white">
          {timeline.length > 0 ? (
            <div className="space-y-0">
              {timeline.map((entry, idx) => (
                <div key={entry.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1.5 ${
                      entry.type === "order" ? "bg-secondary" : "bg-tertiary"
                    }`} />
                    {idx < timeline.length - 1 && (
                      <div className="w-px flex-1 bg-outline-variant/50 min-h-[24px]" />
                    )}
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-label-caps text-button-text ${
                        entry.type === "order" ? "" : "text-tertiary"
                      }`}>
                        {entry.label}
                      </span>
                      {entry.description && (
                        <span className="text-body-md text-on-surface-variant">· {entry.description}</span>
                      )}
                      <span className={`text-label-caps ${
                        entry.type === "order" ? "text-on-surface-variant" : "text-tertiary/60"
                      }`}>
                        [{entry.type === "order" ? "Đơn hàng" : "Vận chuyển"}]
                      </span>
                    </div>
                    <p className="text-body-md text-on-surface-variant">
                      {new Date(entry.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-on-surface-variant py-4">Chưa có dữ liệu</p>
          )}
        </div>
      </div>
    </div>
  );
}
