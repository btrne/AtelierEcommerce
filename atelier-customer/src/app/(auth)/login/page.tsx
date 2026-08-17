"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, getSessionId, finalizeCustomerLogin } from "@/lib/api";
import { useToast } from "@/components/Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

let fbInitialized = false;

function initFacebookSdk(appId: string): void {
  if (fbInitialized || typeof window === "undefined" || !window.FB) return;
  fbInitialized = true;
  window.FB.init({ appId, cookie: true, xfbml: true, version: "v21.0" });
  console.log("[facebook] FB.init done");
}

function waitForFacebookSdk(timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.FB) {
      resolve(true);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      if (window.FB) {
        window.clearInterval(timer);
        resolve(true);
      } else if (Date.now() - started > timeoutMs) {
        window.clearInterval(timer);
        resolve(false);
      }
    }, 200);
  });
}

function loadExternalScript(id: string, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      resolve();
      return;
    }

    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mergeCart, setMergeCart] = useState(false);
  const [hasSessionId, setHasSessionId] = useState(false);

  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const facebookAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const sid = getSessionId();
      setHasSessionId(!!sid);
      setMergeCart(!!sid);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!facebookAppId) return;
    let cancelled = false;
    (async () => {
      const ok = await waitForFacebookSdk(8000);
      if (cancelled) return;
      if (ok) initFacebookSdk(facebookAppId);
      else console.error("[facebook] Không tải được Facebook SDK sau 8s");
    })();
    return () => {
      cancelled = true;
    };
  }, [facebookAppId]);

  const handleGoogleCredential = useCallback(async (resp: { credential: string }) => {
    setLoading(true);
    try {
      const data = await auth.googleLogin(resp.credential);
      if (!data.roles || !data.roles.includes("Customer")) {
        throw new Error("Tài khoản không có quyền truy cập trang khách hàng.");
      }
      await finalizeCustomerLogin(data, mergeCart);
      router.push("/");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Đăng nhập Google thất bại", "error");
    } finally {
      setLoading(false);
    }
  }, [mergeCart, router, toast]);

  useEffect(() => {
    if (!googleClientId) return;
    let cancelled = false;

    loadExternalScript("google-identity-sdk", "https://accounts.google.com/gsi/client")
      .then(() => {
        if (cancelled || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredential,
          auto_select: false,
        });
      })
      .catch(() => {
        console.error("[google] SDK script load failed");
      });

    return () => {
      cancelled = true;
    };
  }, [googleClientId, handleGoogleCredential]);

  async function handleFacebookLogin() {
    if (!facebookAppId) return;
    if (typeof window === "undefined") return;

    if (!window.FB) {
      console.warn("[facebook] SDK chưa sẵn sàng, chờ tải...");
      const ok = await waitForFacebookSdk(4000);
      if (!ok || !window.FB) {
        toast.showToast("Không thể tải Facebook SDK. Vui lòng thử lại sau hoặc đăng nhập bằng email.", "error");
        return;
      }
    }
    if (!fbInitialized) initFacebookSdk(facebookAppId);

    setLoading(true);
    const FB = window.FB;
    try {
      FB.login((resp) => {
        void (async () => {
          const accessToken = resp.authResponse?.accessToken;
          if (!accessToken) {
            toast.showToast(resp.error?.message || "Đăng nhập Facebook bị hủy", "error");
            setLoading(false);
            return;
          }
          try {
            const data = await auth.facebookLogin(accessToken);
            if (!data.roles || !data.roles.includes("Customer")) {
              throw new Error("Tài khoản không có quyền truy cập trang khách hàng.");
            }
            await finalizeCustomerLogin(data, mergeCart);
            router.push("/");
          } catch (err: unknown) {
            console.error("[facebook] backend error", err);
            toast.showToast(err instanceof Error ? err.message : "Đăng nhập Facebook thất bại", "error");
          } finally {
            setLoading(false);
          }
        })();
      }, { scope: "email,public_profile" });
    } catch (err) {
      console.error("[facebook] FB.login error", err);
      setLoading(false);
      toast.showToast("Không thể mở cửa sổ đăng nhập Facebook.", "error");
    }
  }

  useEffect(() => {
    if (!facebookAppId) return;
    let cancelled = false;

    loadExternalScript("facebook-sdk", "https://connect.facebook.net/en_US/sdk.js")
      .then(async () => {
        console.log("[facebook] SDK script loaded");
        const ok = await waitForFacebookSdk(8000);
        if (cancelled) return;
        if (ok) initFacebookSdk(facebookAppId);
        else console.error("[facebook] KhÃ´ng táº£i Ä‘Æ°á»£c Facebook SDK sau 8s");
      })
      .catch(() => {
        console.error("[facebook] SDK script load failed (cÃ³ thá»ƒ do ad-blocker/cháº·n máº¡ng)");
      });

    return () => {
      cancelled = true;
    };
  }, [facebookAppId]);

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
      await finalizeCustomerLogin(data, mergeCart);

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
      {(googleClientId || facebookAppId) && (
        <>
          {googleClientId && (
            <button
              type="button"
              disabled={loading}
              onClick={() => window.google?.accounts.id.prompt()}
              className="w-full flex items-center justify-center gap-3 border border-outline-variant py-4 font-body-md hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">google</span>
              Tiếp tục với Google
            </button>
          )}
          {facebookAppId && (
            <button
              type="button"
              disabled={loading}
              onClick={handleFacebookLogin}
              className="w-full flex items-center justify-center gap-3 border border-outline-variant py-4 font-body-md hover:bg-surface-container transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-xl">facebook</span>
              Tiếp tục với Facebook
            </button>
          )}
          <div className="flex items-center gap-4 my-4">
            <span className="flex-1 border-t border-outline-variant" />
            <span className="font-label-caps text-label-caps text-on-surface-variant">hoặc</span>
            <span className="flex-1 border-t border-outline-variant" />
          </div>
        </>
      )}
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
