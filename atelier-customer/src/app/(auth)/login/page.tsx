"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setToken, storeUserProfile, getSessionId, clearSessionId } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mergeCart, setMergeCart] = useState(false);
  const [hasSessionId, setHasSessionId] = useState(false);

  useEffect(() => {
    const sid = getSessionId();
    setHasSessionId(!!sid);
    setMergeCart(!!sid);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.showToast("Vui lòng nhập email và mật khẩu", "warning");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.text();
        let message = body || "Đăng nhập thất bại";
        try {
          const parsed = JSON.parse(body);
          message = parsed.Error || parsed.error || parsed.message || message;
        } catch { }
        throw new Error(message);
      }
      const data = await res.json();
      if (!data.roles || !data.roles.includes("Customer")) {
        throw new Error("Tài khoản không có quyền truy cập trang khách hàng.");
      }
      setToken(data.token);
      storeUserProfile(data);

      const sessionId = getSessionId();
      if (mergeCart && sessionId) {
        try {
          await fetch(`${API_BASE}/carts/merge`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.token}` },
            body: JSON.stringify({ sessionId }),
          });
        } catch { }
        clearSessionId();
      }

      router.push("/");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Đăng nhập thất bại", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full max-w-[480px] px-margin-mobile md:px-0">
      <div className="text-center mb-6">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-4">Đăng nhập</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Chào mừng bạn trở lại với Atelier.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
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
        <div className="flex justify-end">
          <Link href="#" className="font-label-caps text-label-caps text-on-surface-variant btn-hover-line">
            Quên mật khẩu?
          </Link>
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
          <span className="relative z-10">{loading ? "Đang xử lý..." : "Đăng nhập"}</span>
        </button>
        <div className="text-center pt-3">
          <p className="font-body-md text-on-surface-variant">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-primary font-semibold btn-hover-line">Đăng ký</Link>
          </p>
        </div>
      </form>
    </section>
  );
}
