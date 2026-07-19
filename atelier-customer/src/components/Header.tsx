"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth, cart as cartApi } from "@/lib/api";
import SearchOverlay from "./SearchOverlay";

export default function Header() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      setScrolled(isScrolled);
      document.documentElement.style.setProperty('--header-height', isScrolled ? '70px' : '100px');
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`header-transition bg-surface border-b border-outline-variant w-full fixed top-0 z-50 flex items-center ${scrolled ? 'h-[70px] shadow-md' : 'h-[100px] shadow-none'}`}>
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop flex justify-between items-center w-full">
        {/* Left: Search Icon */}
        <div className="hidden md:flex items-center flex-1">
          <button onClick={() => setIsSearchOpen(true)} className="hover:opacity-70 transition-opacity duration-300">
            <span className="material-symbols-outlined text-primary">search</span>
          </button>
        </div>

        {/* Center: Brand Logo */}
        <div className="flex-1 text-center">
          <Link
            href="/"
            className="font-headline-md text-headline-md tracking-[0.2em] text-primary uppercase"
          >
            ATELIER
          </Link>
        </div>

        {/* Right: Account & Cart */}
        <div className="flex-1 flex justify-end items-center gap-margin-mobile">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Link href={isLoggedIn ? "/account" : "/login"} className="relative hover:opacity-70 transition-opacity block">
                <span className="material-symbols-outlined text-primary" data-icon="person">
                  person
                </span>
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
            <Link href="/cart" className="relative hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-primary" data-icon="shopping_bag">
                shopping_bag
              </span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-secondary text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 hover:bg-surface-container-low rounded-full transition-colors"
            >
              <span className="material-symbols-outlined text-primary">
                {menuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </div>

      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-surface border-b border-outline-variant/30 shadow-lg md:hidden">
          <nav className="flex flex-col p-4">
            <Link href="/" className="px-4 py-3 text-body-sm uppercase tracking-widest hover:text-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              Trang chủ
            </Link>
            <Link href="/products" className="px-4 py-3 text-body-sm uppercase tracking-widest hover:text-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              Sản phẩm
            </Link>
            <Link href="/collections" className="px-4 py-3 text-body-sm uppercase tracking-widest hover:text-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              Bộ sưu tập
            </Link>
            <Link href="/story" className="px-4 py-3 text-body-sm uppercase tracking-widest hover:text-secondary transition-colors" onClick={() => setMenuOpen(false)}>
              Câu chuyện
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}