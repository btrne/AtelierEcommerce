"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { orders as ordersApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import type { OrderAdminDto } from "@/lib/types";

const statusClass: Record<string, string> = {
  Pending: "bg-primary text-white",
  Confirmed: "bg-secondary text-white",
  Processing: "bg-tertiary text-white",
  Shipping: "bg-secondary-container text-on-secondary-container",
  Completed: "bg-surface-container-high text-on-surface",
  Cancelled: "bg-error text-white",
};

const statusLabel: Record<string, string> = {
  Pending: "CHỜ XỬ LÝ",
  Confirmed: "ĐÃ XÁC NHẬN",
  Processing: "ĐANG XỬ LÝ",
  Shipping: "ĐANG GIAO",
  Completed: "HOÀN THÀNH",
  Cancelled: "ĐÃ HUỶ",
};

export default function OrdersPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<OrderAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");


  const fetchOrders = () => {
    setLoading(true);
    ordersApi
      .admin({ page, pageSize: 15, status: statusFilter || undefined, search: search || undefined })
      .then((res) => {
        setData(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", minimumFractionDigits: 0 }).format(amount);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo mã đơn, tên khách..."
            className="border border-outline-variant bg-surface font-body-md text-body-md px-3 py-2 outline-none focus:border-primary w-72"
          />
          <button type="submit" className="bg-primary text-white font-label-caps text-label-caps px-4 py-2 hover:bg-primary/90">
            TÌM
          </button>
        </form>
        <div className="flex gap-2 flex-wrap">
          {["", "Pending", "Confirmed", "Processing", "Shipping", "Completed", "Cancelled"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`font-label-caps text-button-text px-3 py-1.5 border transition-all ${
                statusFilter === s
                  ? "bg-primary text-white border-primary"
                  : "border-outline-variant text-on-surface-variant hover:border-primary"
              }`}
            >
              {s ? statusLabel[s] : "TẤT CẢ"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">MÃ ĐƠN</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">KHÁCH HÀNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SĐT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">TỔNG TIỀN</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">TRẠNG THÁI</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NGÀY TẠO</th>
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
                <td colSpan={7} className="p-6 text-center text-on-surface-variant">Không có đơn hàng</td>
              </tr>
            ) : (
              data.map((order) => (
                <tr key={order.id} className="table-row-hover transition-colors">
                  <td className="p-3 font-body-md font-bold">{order.orderCode}</td>
                  <td className="p-3">
                    <div>
                      <p className="font-body-md font-bold">{order.shippingContactName}</p>
                      <p className="text-body-md text-on-surface-variant">{order.customerEmail}</p>
                    </div>
                  </td>
                  <td className="text-center p-3 font-body-md">{order.shippingPhone}</td>
                  <td className="p-3 font-body-md font-bold text-secondary">{formatCurrency(order.totalAmount)}</td>
                  <td className="p-3">
                    <span className={`text-center font-label-caps text-button-text px-2 py-0.5 ${statusClass[order.orderStatus] || ""}`}>
                      {statusLabel[order.orderStatus] || order.orderStatus}
                    </span>
                  </td>
                  <td className="text-center p-3 font-body-md text-body-md text-on-surface-variant">
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-3 text-center">
                    <Link href={`/orders/${order.id}`} className="text-center font-label-caps text-button-text border border-primary px-3 py-1.5 hover:bg-primary hover:text-white transition-all inline-block">
                      CHI TIẾT
                    </Link>
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

    </div>
  );
}
