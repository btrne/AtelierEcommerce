"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cart } from "@/lib/api";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"processing" | "success" | "failed">("processing");
  const [message, setMessage] = useState("");
  const [transactionNo, setTransactionNo] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const statusParam = searchParams.get("status") || searchParams.get("result");
    const id = searchParams.get("orderId");
    const txn = searchParams.get("transactionNo");

    setOrderId(id);
    setTransactionNo(txn);

    if (statusParam === "success") {
      setStatus("success");
      setMessage("Thanh toán thành công!");
      cart.clear().catch(() => {});
    } else if (statusParam === "fail" || statusParam === "failed") {
      setStatus("failed");
      setMessage("Thanh toán thất bại");
    } else if (statusParam === "cancelled") {
      setStatus("failed");
      setMessage("Bạn đã hủy thanh toán");
    } else if (id) {
      setStatus("success");
      setMessage("Đơn hàng đã được đặt thành công!");
      cart.clear().catch(() => {});
    } else {
      setStatus("failed");
      setMessage("Có lỗi xảy ra");
    }
  }, [searchParams]);

  if (status === "processing") {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-2 py-16 text-center">
      <span className={`material-symbols-outlined text-6xl mb-4 ${status === "success" ? "text-green-600" : "text-error"}`}>
        {status === "success" ? "check_circle" : "cancel"}
      </span>
      <h1 className="font-headline-md text-headline-md mb-4">
        {status === "success" ? "Thanh toán thành công!" : "Thanh toán thất bại"}
      </h1>
      <p className="text-body-sm text-on-surface-variant mb-2">{message}</p>
      {status === "success" && transactionNo && (
        <p className="text-body-sm text-on-surface-variant mb-8">
          Mã giao dịch: <span className="font-bold text-primary">{transactionNo}</span>
        </p>
      )}
      {orderId && (
        <p className="text-body-sm text-on-surface-variant mb-8">
          Mã đơn hàng: <span className="font-bold">#{orderId}</span>
        </p>
      )}
      <div className="flex gap-4 justify-center">
        <Link href="/account?tab=orders" className="bg-primary text-on-primary px-8 py-3 text-body-sm uppercase tracking-widest hover:opacity-90">
          Xem đơn hàng
        </Link>
        <Link href="/products" className="border border-primary px-8 py-3 text-body-sm uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors">
          Tiếp tục mua sắm
        </Link>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
      <PaymentResultContent />
    </Suspense>
  );
}
