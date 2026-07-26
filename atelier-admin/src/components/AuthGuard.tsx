"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/api";
import LoginSheet from "@/components/LoginSheet";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [loginReason, setLoginReason] = useState<"expired" | "no-permission" | null>(null);

  const checkAuth = useCallback(() => {
    const isAuth = auth.isAuthenticated();
    if (isAuth) {
      const roles = auth.getUserRoles();
      const isAllowed = roles.includes("Admin") || roles.includes("Staff");
      if (!isAllowed) {
        auth.logout();
        setAuthenticated(false);
        setLoginReason("no-permission");
        return;
      }
    }
    setAuthenticated(isAuth);
    if (!isAuth) setLoginReason(null);
  }, []);

  useEffect(() => {
    checkAuth();

    const handleExpired = () => {
      setAuthenticated(false);
      setLoginReason("expired");
    };
    window.addEventListener("auth:expired", handleExpired);
    return () => window.removeEventListener("auth:expired", handleExpired);
  }, [checkAuth]);

  useEffect(() => {
    checkAuth();
  }, [pathname, checkAuth]);

  if (authenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-on-surface-variant font-body-md">Đang tải...</div>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginSheet reason={loginReason} onSuccess={checkAuth} />;
  }

  return <>{children}</>;
}
