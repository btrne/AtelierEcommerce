"use client";

import { useEffect, useState } from "react";
import { ratings as ratingsApi } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
import type { RatingAdminDto } from "@/lib/types";

export default function RatingsPage() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<RatingAdminDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = () => {
    setLoading(true);
    ratingsApi
      .admin({ page, pageSize: 15 })
      .then((res) => {
        setData(res.items);
        setTotalPages(res.totalPages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const renderStars = (stars: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={`material-symbols-outlined text-body-md ${i < stars ? "text-secondary" : "text-on-surface-variant/30"}`}>
        {i < stars ? "star" : "star"}
      </span>
    ));
  };

  const handleDelete = async (id: number) => {
    if (await confirm("Xóa đánh giá này?")) {
      try {
        await ratingsApi.delete(id);
        showToast("Xóa đánh giá thành công", "success");
        fetchData();
      } catch (err: any) {
        showToast(err.message || "Lỗi", "error");
      }
    }
  };

  return (
    <div className="space-y-8">
      <div className="overflow-x-auto border border-outline-variant">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-surface-container-high">
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NGƯỜI DÙNG</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SẢN PHẨM</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">SAO</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NHẬN XÉT</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">NGÀY</th>
              <th className="p-3 font-label-caps text-button-text text-on-surface-variant font-bold text-center">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30">
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-on-surface-variant animate-pulse">Đang tải...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-on-surface-variant">Chưa có đánh giá</td>
              </tr>
            ) : (
              data.map((r) => (
                <tr key={r.id} className="table-row-hover transition-colors">
                  <td className="p-3 font-body-md">{r.userName || `User #${r.userId}`}</td>
                  <td className="p-3 font-body-md text-body-md text-on-surface-variant">{r.productName || "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center">{renderStars(r.stars)}</div>
                  </td>
                  <td className="p-3 font-body-md text-body-md text-on-surface-variant max-w-[300px] truncate">
                    {r.comment || "—"}
                  </td>
                  <td className="p-3 font-body-md text-body-md text-on-surface-variant">
                    {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => handleDelete(r.id)} className="font-label-caps text-button-text border border-error text-error px-3 py-1.5 hover:bg-error hover:text-white transition-all">
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
    </div>
  );
}
