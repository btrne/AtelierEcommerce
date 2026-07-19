"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/api";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/login") {
      setChecked(true);
      return;
    }

    if (!auth.isAuthenticated()) {
      router.replace("/login");
      return;
    }

    const roles = auth.getUserRoles();
    const isAllowed = roles.includes("Admin") || roles.includes("Staff");

    if (!isAllowed) {
      auth.logout();
      router.replace("/login?reason=no-permission");
      return;
    }

    setChecked(true);
  }, [pathname, router]);

  if (!checked) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse text-on-surface-variant font-body-md">Đang tải...</div>
      </div>
    );
  }

  return <>{children}</>;
}
