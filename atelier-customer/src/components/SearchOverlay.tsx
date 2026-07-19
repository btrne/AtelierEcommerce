"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { products as productsApi, categories as categoriesApi, collections as collectionsApi } from "@/lib/api";
import { track } from "@/lib/tracking";
import type { ProductCustomerDto, CategoryDto, CollectionDto } from "@/lib/types";
import { formatCurrency } from "@/utils/format";

const DEBOUNCE_MS = 300;

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ isOpen, onClose }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductCustomerDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [allCategories, setAllCategories] = useState<CategoryDto[]>([]);
  const [allCollections, setAllCollections] = useState<CollectionDto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    categoriesApi.list().then(setAllCategories).catch(() => {});
    collectionsApi.list().then(setAllCollections).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    setProducts([]);
    setCategories([]);
    setCollections([]);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setProducts([]); setCategories([]); setCollections([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const lower = q.toLowerCase();
        const [productResults] = await Promise.all([productsApi.list({ search: lower })]);
        setProducts(productResults);
        setCategories(allCategories.filter((c) => c.name.toLowerCase().includes(lower)));
        setCollections(allCollections.filter((c) => c.slug && c.name.toLowerCase().includes(lower)));
      } catch { }
      finally { setLoading(false); }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, allCategories, allCollections, isOpen]);

  if (!isOpen) return null;

  const hasResults = products.length > 0 || categories.length > 0 || collections.length > 0;

  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border-b border-outline-variant" onClick={(e) => e.stopPropagation()}>
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-6">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-primary">search</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && query.trim()) track("search", null, null, { query: query.trim() }); }}
              placeholder="Tìm kiếm sản phẩm, danh mục..."
              className="flex-1 bg-transparent border-none outline-none font-body-md text-body-md placeholder:text-outline-variant"
            />
            <button onClick={onClose} className="hover:opacity-70 transition-opacity">
              <span className="material-symbols-outlined text-primary">close</span>
            </button>
          </div>
        </div>

        {query.trim() && (
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pb-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {loading ? (
              <p className="font-body-md text-on-surface-variant py-4">Đang tìm kiếm...</p>
            ) : hasResults ? (
              <div className="py-4 space-y-8">
                {products.length > 0 && (
                  <div>
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-3">Sản phẩm</h3>
                    <div className="space-y-3">
                      {products.slice(0, 5).map((p) => (
                        <Link key={p.id} href={`/products/${p.slug}`} onClick={() => { track("search", null, null, { query: query.trim() }); track("search_result_click", "Product", p.id, { query: query.trim() }); onClose(); }} className="flex items-center gap-3 group">
                          <div className="w-12 h-12 bg-surface-container-low overflow-hidden shrink-0">
                            {p.thumbnailUrl && <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-body-md text-sm truncate group-hover:text-primary transition-colors">{p.name}</p>
                            <p className="font-label-caps text-[10px] text-on-surface-variant">{formatCurrency(p.minPrice)}</p>
                          </div>
                        </Link>
                      ))}
                      {products.length > 5 && (
                        <Link href={`/products?search=${encodeURIComponent(query.trim())}`} onClick={() => { track("search", null, null, { query: query.trim() }); onClose(); }}
                          className="block font-label-caps text-[10px] text-primary btn-hover-line mt-2">
                          Xem tất cả {products.length} sản phẩm
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {categories.length > 0 && (
                  <div>
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-3">Danh mục</h3>
                    <div className="space-y-2">
                      {categories.map((c) => (
                        <Link key={c.id} href={`/category/${c.slug}`} onClick={onClose}
                          className="block font-body-md text-sm hover:text-primary transition-colors">
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {collections.length > 0 && (
                  <div>
                    <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase mb-3">Bộ sưu tập</h3>
                    <div className="space-y-3">
                      {collections.map((c) => (
                        <Link key={c.id} href={`/collections/${c.slug}`} onClick={onClose} className="flex items-center gap-3 group">
                          <div className="w-12 h-12 bg-surface-container-low overflow-hidden shrink-0">
                            {c.bannerImageUrl && <img src={c.bannerImageUrl} alt="" className="w-full h-full object-cover" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-body-md text-sm truncate group-hover:text-primary transition-colors">{c.name}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="font-body-md text-on-surface-variant py-4">Không tìm thấy kết quả phù hợp.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
