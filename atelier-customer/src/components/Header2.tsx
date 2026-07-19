"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth, cart as cartApi } from "@/lib/api";
import SearchOverlay from "./SearchOverlay";

const navItems = [
  { href: "/", label: "Trang chủ" },
  { href: "/products", label: "Sản phẩm" },
  { href: "/collections", label: "Bộ sưu tập" },
  { href: "/story", label: "Câu chuyện" },
];

export default function Header2({ fixed = true }: { fixed?: boolean }) {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--header-height', '100px');
  }, []);

  const fetchCartCount = useCallback(() => {
    cartApi.get()
      .then((data) => setCartCount(data.totalItems))
      .catch(() => setCartCount(0));
  }, []);

  useEffect(() => {
    setIsLoggedIn(auth.isLoggedIn());
    fetchCartCount();
  }, [pathname, fetchCartCount]);

  useEffect(() => {
    window.addEventListener("cart-updated", fetchCartCount);
    return () => window.removeEventListener("cart-updated", fetchCartCount);
  }, [fetchCartCount]);

  return (
    <header className={`bg-surface border-b border-outline-variant ${fixed ? 'fixed top-0 w-full z-50' : ''} h-[100px] transition-all duration-300 ease-in-out`}>
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto h-full">
        <div className="flex items-center gap-10">
          <Link href="/" className="font-headline-md text-headline-md tracking-widest text-primary uppercase">
            ATELIER
          </Link>
          <nav className="hidden md:flex gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`font-label-caps text-label-caps transition-opacity duration-300 ${
                    isActive ? "text-primary" : "text-on-surface-variant hover:opacity-70"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setIsSearchOpen(true)} className="hover:opacity-70 transition-opacity duration-300">
            <span className="material-symbols-outlined text-primary">search</span>
          </button>
          <div className="relative group">
            <Link href={isLoggedIn ? "/account" : "/login"} className="hover:opacity-70 transition-opacity duration-300 block">
              <span className="material-symbols-outlined text-primary">person</span>
            </Link>
            {isLoggedIn && (
              <div className="absolute right-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="bg-surface border border-outline-variant shadow-lg min-w-[180px]">
                  <Link href="/account" className="flex items-center gap-3 px-5 py-3.5 font-body-md text-body-md text-on-surface hover:bg-surface-container-low transition-colors">
                    <span className="material-symbols-outlined text-lg">person</span>
                    Hồ sơ
                  </Link>
                  <button onClick={() => auth.logout()} className="flex items-center gap-3 w-full px-5 py-3.5 font-body-md text-body-md text-on-surface hover:bg-surface-container-low transition-colors text-left">
                    <span className="material-symbols-outlined text-lg">logout</span>
                    Đăng xuất
                  </button>
                </div>
              </div>
            )}
          </div>
          <Link href="/cart" className="hover:opacity-70 transition-opacity duration-300 relative">
            <span className="material-symbols-outlined text-primary">shopping_bag</span>
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-on-primary text-[10px] flex items-center justify-center rounded-full">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden hover:opacity-70 transition-opacity duration-300"
          >
            <span className="material-symbols-outlined text-primary">
              {menuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-surface border-b border-outline-variant shadow-lg md:hidden">
          <nav className="flex flex-col p-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-4 py-3 font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
