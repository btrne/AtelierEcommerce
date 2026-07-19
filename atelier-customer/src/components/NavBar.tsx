"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/products", label: "Sản phẩm" },
  { href: "/collections", label: "Bộ sưu tập" },
  { href: "/story", label: "Câu chuyện" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="nav-transition hidden md:flex justify-center items-center h-12 bg-surface/90 backdrop-blur-md fixed w-full z-40 border-b border-outline-variant/30" style={{ top: 'var(--header-height, 100px)' }}>
      <ul className="flex gap-12">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`font-label-caps text-label-caps ${isActive ? 'text-primary border-b-2 border-primary pb-1' : 'text-on-surface-variant hover:text-primary transition-colors'}`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
