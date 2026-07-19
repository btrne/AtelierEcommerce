"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, setToken, storeUserProfile, setUserRoles } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reason = params.get("reason");
    if (reason === "expired") {
      setToast("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại");
    } else if (reason === "no-permission") {
      setToast("Tài khoản không có quyền truy cập trang admin");
    }
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Vui lòng nhập email và mật khẩu", "warning");
      return;
    }
    setToast("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.text();
        let message = body || "Email hoặc mật khẩu không hợp lệ";
        try {
          const parsed = JSON.parse(body);
          message = parsed.message || parsed.title || parsed.error || message;
        } catch {}
        throw new Error(message);
      }
      const data = await res.json();
      const isAllowed = data.roles?.includes("Admin") || data.roles?.includes("Staff");
      if (!isAllowed) {
        throw new Error("Tài khoản không có quyền truy cập trang quản trị.");
      }
      setToken(data.token);
      storeUserProfile(data);
      setUserRoles(data.roles);
      router.push("/");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      setToast(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="top-0 left-0 w-full z-50 h-[100px] flex items-center bg-surface/80 backdrop-blur-sm px-8">
        <Link className="font-headline-md text-headline-md font-normal tracking-widest text-primary uppercase flex items-end gap-1.5" href="/">
          Atelier
          <span className="font-label-caps text-body-md text-on-surface-variant tracking-normal upcase leading-none pb-[3px]">admin</span>
        </Link>
      </header>

      <div className="fixed inset-0 -z-10 overflow-hidden opacity-10">
        <img
          alt=""
          className="w-full h-full object-cover grayscale"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDc5LYNm24VbdkskEfZZpv7OsFbWdxmcMegME_SWqK0M6sld4V2lnvXxoMaZw_le8ApKvpmV8rHnjfY0eVDPSOvCOMYanFHMmm3DF1Sp3rMmK07dF5GWv3noQxam8MLZQ3rTYW4dSQrNDffDcpUj7OebwHcWGxpouu-GAMVlEPCz2O-slEXC9U6Er-pfxClYvXqqiocgZfS5hlVjhPz7fZZ4JG6atUSXTzwDuMAeQbzKr4bB14UEUOJgSW_bJisDPJ1s8ScJfdj6U09"
        />
      </div>

      <div className="flex-1 flex flex-col justify-center items-center pt-[100px] pb-[100px]">
        <div className="w-full max-w-[480px] px-8 md:px-0">
          <div className="text-center mb-10">
            <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Đăng nhập</h1>
            <p className="font-label-caps text-label-caps text-on-surface-variant mt-2">QUẢN TRỊ VIÊN</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <label
                htmlFor="email"
                className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
                placeholder="admin@atelier.com"
              />
            </div>

            <div className="relative group">
              <label
                htmlFor="password"
                className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]"
              >
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary py-5 font-button-text text-button-text uppercase tracking-[0.15em] hover:opacity-80 active:opacity-70 transition-all duration-300 group relative overflow-hidden"
            >
              {loading ? "Đang xử lý..." : "Đăng nhập"}
            </button>
          </form>
        </div>
      </div>

      <footer className="mt-auto border-t border-outline-variant/30 py-8 px-10 flex flex-col md:flex-row justify-end items-center gap-x-8 gap-y-2 w-full bg-surface">
        <p className="text-[11px] text-on-surface-variant tracking-wider">
          © 2024 ATELIER ADMIN PANEL. TRUY CẬP NỘI BỘ.
        </p>
        <div className="flex gap-6">
          <a className="text-[10px] tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">CHÍNH SÁCH BẢO MẬT</a>
          <a className="text-[10px] tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">HƯỚNG DẪN VẬN HÀNH</a>
          <a className="text-[10px] tracking-widest text-on-surface-variant hover:text-primary transition-colors" href="#">NHẬT KÝ HỆ THỐNG</a>
        </div>
      </footer>

      {toast && (
        <div className="fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 border-l-4 border-l-error bg-surface-container text-on-surface shadow-lg animate-slide-in max-w-sm">
          <span className="material-symbols-outlined text-lg shrink-0 text-error">error</span>
          <p className="font-body-md text-body-md flex-1">{toast}</p>
          <button onClick={() => setToast("")} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slide-in {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }

      `}</style>
    </div>
  );
}
