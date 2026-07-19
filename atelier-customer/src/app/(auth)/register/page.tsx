"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, getSessionId, clearSessionId } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

export default function RegisterPage() {
  const router = useRouter();
  const toast = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mergeCart, setMergeCart] = useState(false);
  const [hasSessionId, setHasSessionId] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    const sid = getSessionId();
    setHasSessionId(!!sid);
    setMergeCart(!!sid);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      toast.showToast("Vui lòng điền đầy đủ thông tin", "warning");
      return;
    }
    if (password !== confirmPassword) {
      toast.showToast("Mật khẩu xác nhận không khớp", "warning");
      return;
    }
    if (password.length < 6) {
      toast.showToast("Mật khẩu phải có ít nhất 6 ký tự", "warning");
      return;
    }
    if (!agreedToTerms) {
      toast.showToast("Vui lòng đồng ý với điều khoản và điều kiện", "warning");
      return;
    }
    setLoading(true);
    try {
      const result = await auth.register({ fullName, email, password, phone: phone || undefined });

      const sessionId = getSessionId();
      if (mergeCart && sessionId) {
        try {
          await fetch(`${API_BASE}/carts/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${result.token}` },
            body: JSON.stringify({ sessionId }),
          });
        } catch { }
        clearSessionId();
      }

      router.push("/");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Đăng ký thất bại", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-[480px] px-margin-mobile md:px-0">
      <div className="text-center mb-6">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-4">Tạo tài khoản</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Khám phá thế giới đồ da thủ công tinh xảo.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="relative group">
          <label className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]" htmlFor="full_name">Họ và Tên</label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nhập họ và tên của bạn"
            className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
          />
        </div>
        <div className="relative group">
          <label className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]" htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@atelier.com"
            className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
          />
        </div>
        <div className="relative group">
          <label className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]" htmlFor="phone">Số điện thoại</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Nhập số điện thoại của bạn"
            className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative group">
            <label className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]" htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
            />
          </div>
          <div className="relative group">
            <label className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]" htmlFor="confirm_password">Xác nhận mật khẩu</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
            />
          </div>
        </div>
        <div className="flex items-start gap-3 pt-1">
          <div className="flex items-center h-5">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="h-4 w-4 rounded-none border-outline-variant text-primary focus:ring-0"
            />
          </div>
          <div className="text-sm">
            <label className="font-body-md text-on-surface-variant leading-tight" htmlFor="terms">
              Tôi đồng ý với các <a className="text-primary underline underline-offset-4 hover:text-secondary transition-colors" href="#">điều khoản và điều kiện</a> của Atelier.
            </label>
          </div>
        </div>
        {hasSessionId && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={mergeCart} onChange={(e) => setMergeCart(e.target.checked)}
              className="w-4 h-4 accent-primary" />
            <span className="font-body-md text-sm text-on-surface-variant">Lưu giỏ hàng tạm thời vào tài khoản</span>
          </label>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary text-on-primary py-5 font-button-text text-button-text uppercase tracking-[0.15em] hover:opacity-80 active:opacity-70 transition-all duration-300 mt-2 group relative overflow-hidden"
        >
          <span className="relative z-10">{loading ? "Đang xử lý..." : "Tạo tài khoản"}</span>
        </button>
        <div className="text-center pt-3">
          <p className="font-body-md text-on-surface-variant">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-primary font-semibold btn-hover-line">Đăng nhập</Link>
          </p>
        </div>
      </form>
    </section>
  );
}
