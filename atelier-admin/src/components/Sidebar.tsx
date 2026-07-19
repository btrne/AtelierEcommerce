"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface MenuGroup {
  label: string;
  items: { href: string; icon: string; label: string }[];
  separator?: "space" | "border";
}

const menuGroups: MenuGroup[] = [
  {
    label: "QUẢN TRỊ HỆ THỐNG",
    items: [
      { href: "/", icon: "dashboard", label: "TỔNG QUAN" },
      { href: "/orders", icon: "shopping_bag", label: "ĐƠN HÀNG" },
      { href: "/payments", icon: "payments", label: "THANH TOÁN" },
      { href: "/shipping", icon: "local_shipping", label: "VẬN CHUYỂN" },
      { href: "/vouchers", icon: "confirmation_number", label: "VOUCHER" },
    ],
  },
  {
    label: "QUẢN LÝ CỬA HÀNG",
    separator: "space",
    items: [
      { href: "/products", icon: "inventory_2", label: "SẢN PHẨM" },
      { href: "/categories", icon: "category", label: "DANH MỤC" },
      { href: "/collections", icon: "collections", label: "BỘ SƯU TẬP" },
      { href: "/combos", icon: "local_offer", label: "COMBO" },
      { href: "/attributes", icon: "tune", label: "THUỘC TÍNH" },
      { href: "/inventory", icon: "warehouse", label: "TỒN KHO" },
    ],
  },
  {
    label: "QUAN HỆ KHÁCH HÀNG",
    separator: "space",
    items: [
      { href: "/users", icon: "group", label: "NGƯỜI DÙNG" },
      { href: "/custom-requests", icon: "auto_fix_high", label: "CHẾ TÁC RIÊNG" },
      { href: "/ratings", icon: "reviews", label: "ĐÁNH GIÁ" },
    ],
  },
  {
    label: "CẤU HÌNH & HỖ TRỢ",
    separator: "border",
    items: [
      { href: "/roles", icon: "admin_panel_settings", label: "PHÂN QUYỀN" },
      { href: "/support", icon: "support_agent", label: "HỖ TRỢ" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-surface-container-low h-screen sticky top-0 border-r border-outline-variant py-10 space-y-8 min-h-screen overflow-y-auto">
      <div className="px-8">
        <h1 className="font-headline-md text-headline-md tracking-tighter text-primary">
          ATELIER
        </h1>
            <p className="font-label-caps text-[10px] text-secondary mt-1">
              SYSTEM ADMINISTRATION
            </p>
      </div>
      <nav className="flex-1 px-4 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <div className={`px-4 py-2 ${group.separator === "space" ? "pt-6" : ""} ${group.separator === "border" ? "pt-6 border-t border-outline-variant/30" : ""}`}>
              <span className="font-label-caps text-on-surface-variant opacity-50">
                {group.label}
              </span>
            </div>
            {group.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-4 px-4 py-3 transition-all duration-200 ${
                    isActive
                      ? "sidebar-active"
                      : "text-on-surface-variant hover:bg-surface-container-high pl-4"
                  }`}
                >
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span className="font-label-caps text-label-caps">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}
