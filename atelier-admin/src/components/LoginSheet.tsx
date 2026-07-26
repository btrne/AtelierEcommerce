"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface LoginSheetProps {
  reason?: "expired" | "no-permission" | null;
  onSuccess: () => void;
}

export default function LoginSheet({ reason, onSuccess }: LoginSheetProps) {
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (reason === "expired") {
      shownRef.current = true;
      showToast("Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại", "error");
    } else if (reason === "no-permission") {
      shownRef.current = true;
      showToast("Tài khoản không có quyền truy cập trang admin", "error");
    }
  }, [reason, showToast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast("Vui lòng nhập email và mật khẩu", "warning");
      return;
    }
    setLoading(true);
    try {
      await auth.login({ email, password });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Đăng nhập thất bại";
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-fade-in" />

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-sheet-up">
        <div className="bg-surface rounded-t-[28px] shadow-[0_-4px_24px_rgba(0,0,0,0.12)] max-h-[85vh] flex flex-col overflow-hidden">

          {/* Drag indicator */}
          <div className="flex justify-center pt-3 pb-2 shrink-0">
            <div className="w-10 h-1 rounded-full bg-outline-variant/40" />
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-8 pt-4 pb-10 md:px-12">
            <div className="text-center mb-8">
              <h1 className="font-headline-lg text-headline-lg text-primary mb-2">Đăng nhập</h1>
              <p className="font-label-caps text-label-caps text-on-surface-variant mt-2">QUẢN TRỊ VIÊN</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-[400px] mx-auto">
              <div className="relative group">
                <label
                  htmlFor="login-email"
                  className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full bg-transparent border-t-0 border-x-0 border-b border-outline-variant py-3 px-0 font-body-md text-primary placeholder:text-outline-variant focus:border-primary transition-all duration-300"
                  placeholder="admin@atelier.com"
                  autoFocus
                />
              </div>

              <div className="relative group">
                <label
                  htmlFor="login-password"
                  className="font-label-caps text-label-caps block mb-2 text-on-surface-variant uppercase tracking-[0.2em]"
                >
                  Mật khẩu
                </label>
                <input
                  id="login-password"
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
      </div>

      <style>{`
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-sheet-up {
          animation: sheet-up 0.45s cubic-bezier(0.32, 0.72, 0, 1) forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
