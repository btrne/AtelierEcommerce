"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) return <>{children}</>;

  return (
    <>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background">
        <DashboardHeader />
        <div className="p-10 max-w-[1440px] mx-auto w-full space-y-12">
          {children}
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
      </main>
    </>
  );
}
