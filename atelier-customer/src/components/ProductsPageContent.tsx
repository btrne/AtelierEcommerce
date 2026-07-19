"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Fragment, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { products as productsApi, categories as categoriesApi, collections as collectionsApi, attributes as attributesApi } from "@/lib/api";
import type { ProductCustomerDto, CategoryDto, CollectionDto, AttributeDto } from "@/lib/types";
import ProductGrid from "@/components/ProductGrid";

const PAGE_SIZES = [12, 24, 48];
const DEFAULT_VISIBLE = 5;

interface Props {
  title: string;
  subtitle?: string;
  backLink?: { href: string; label: string };
  initialCategoryIds?: number[];
  hideCategoryFilter?: boolean;
}

function MobileFilterSection({
  title, items, selectedIds, onToggle,
}: {
  title: string;
  items: { id: number; label: string }[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const limit = expanded ? items.length : 5;
  const visible = items.slice(0, limit);
  const remaining = items.length - limit;

  return (
    <div className="border-b border-outline-variant pb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full font-label-caps text-label-caps text-primary py-3"
      >
        {title}
        <span className={`material-symbols-outlined transition-transform ${expanded ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>
      {expanded && (
        <ul className="space-y-2 pl-1">
          {visible.map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="accent-primary border border-outline w-4 h-4"
                />
                <span className="font-body-md text-body-md">{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      {!expanded && items.length > 5 && (
        <button
          onClick={() => setExpanded(true)}
          className="font-label-caps text-label-caps text-primary hover:underline mt-1"
        >
          + Xem thêm {remaining} lựa chọn
        </button>
      )}
      {expanded && items.length > 5 && (
        <button
          onClick={() => setExpanded(false)}
          className="font-label-caps text-label-caps text-primary hover:underline mt-1"
        >
          Thu gọn
        </button>
      )}
    </div>
  );
}

interface MobileTempFilters {
  categoryIds: number[];
  collectionIds: number[];
  attributeOptionIds: number[];
  minPrice: number | undefined;
  maxPrice: number | undefined;
  minRating: number | undefined;
  inStock: boolean;
  isPreorder: boolean;
}

function ProductsPageContentMain({
  title,
  subtitle,
  backLink,
  initialCategoryIds,
  hideCategoryFilter,
}: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [allProducts, setAllProducts] = useState<ProductCustomerDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [attributes, setAttributes] = useState<AttributeDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(() => {
    if (initialCategoryIds) return initialCategoryIds;
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) { const d = JSON.parse(saved); if (d.categoryIds) return d.categoryIds; }
    } catch {}
    const ids = searchParams.get("categoryIds");
    return ids ? ids.split(",").map(Number) : [];
  });
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) { const d = JSON.parse(saved); if (d.collectionIds) return d.collectionIds; }
    } catch {}
    const ids = searchParams.get("collectionIds");
    return ids ? ids.split(",").map(Number) : [];
  });
  const [selectedAttributeOptionIds, setSelectedAttributeOptionIds] = useState<number[]>(() => {
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) { const d = JSON.parse(saved); if (d.attributeOptionIds) return d.attributeOptionIds; }
    } catch {}
    const ids = searchParams.get("attributeOptionIds");
    return ids ? ids.split(",").map(Number) : [];
  });
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>(() => {
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) {
        const d = JSON.parse(saved);
        return { min: d.minPrice, max: d.maxPrice };
      }
    } catch {}
    return {
      min: searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined,
      max: searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined,
    };
  });
  const [minRating, setMinRating] = useState<number | undefined>(() => {
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) { const d = JSON.parse(saved); if (d.minRating !== undefined) return d.minRating; }
    } catch {}
    const r = searchParams.get("minRating");
    return r ? Number(r) : undefined;
  });
  const [inStock, setInStock] = useState(() => {
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) { const d = JSON.parse(saved); if (d.inStock) return true; }
    } catch {}
    return searchParams.get("inStock") === "true";
  });
  const [isPreorder, setIsPreorder] = useState(() => {
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) { const d = JSON.parse(saved); if (d.isPreorder) return true; }
    } catch {}
    return searchParams.get("isPreorder") === "true";
  });
  const [sortBy, setSortBy] = useState(() => {
    try {
      const saved = sessionStorage.getItem("productFilters");
      if (saved) { const d = JSON.parse(saved); if (d.sortBy) return d.sortBy; }
    } catch {}
    return searchParams.get("sortBy") || "newest";
  });
  const [page, setPage] = useState(() => {
    const p = searchParams.get("page");
    return p ? Number(p) : 1;
  });
  const [pageSize, setPageSize] = useState(() => {
    const p = searchParams.get("pageSize");
    return p ? Number(p) : 12;
  });

  const [customMinPrice, setCustomMinPrice] = useState("");
  const [customMaxPrice, setCustomMaxPrice] = useState("");

  const [mounted, setMounted] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState<Record<string, string>>({});
  const [visibleCount, setVisibleCount] = useState<Record<string, number>>({});

  const [mobileTemp, setMobileTemp] = useState<MobileTempFilters>({
    categoryIds: [],
    collectionIds: [],
    attributeOptionIds: [],
    minPrice: undefined,
    maxPrice: undefined,
    minRating: undefined,
    inStock: false,
    isPreorder: false,
  });

  const filterBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
    collectionsApi.list().then(setCollections).catch(() => {});
    attributesApi.list().then(setAttributes).catch(() => {});
    function handleClick(e: MouseEvent) {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (hideCategoryFilter) return;
    const data = {
      categoryIds: selectedCategoryIds,
      collectionIds: selectedCollectionIds,
      attributeOptionIds: selectedAttributeOptionIds,
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      minRating,
      inStock,
      isPreorder,
      sortBy,
    };
    sessionStorage.setItem("productFilters", JSON.stringify(data));
  }, [selectedCategoryIds, selectedCollectionIds, selectedAttributeOptionIds, priceRange, minRating, inStock, isPreorder, sortBy, hideCategoryFilter]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const params: Record<string, string | number | boolean | undefined> = {};
    setLoading(true);
    if (selectedCategoryIds.length > 0) params.categoryIds = selectedCategoryIds.join(",");
    if (selectedCollectionIds.length > 0) params.collectionIds = selectedCollectionIds.join(",");
    if (selectedAttributeOptionIds.length > 0) params.attributeOptionIds = selectedAttributeOptionIds.join(",");
    if (debouncedSearch) params.search = debouncedSearch;
    if (priceRange.min !== undefined) params.minPrice = priceRange.min;
    if (priceRange.max !== undefined) params.maxPrice = priceRange.max;
    if (minRating !== undefined) params.minRating = minRating;
    if (inStock) params.inStock = true;
    if (isPreorder) params.isPreorder = true;
    if (sortBy) params.sortBy = sortBy;
    productsApi.list(Object.keys(params).length > 0 ? params : undefined)
      .then(setAllProducts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedCategoryIds, selectedCollectionIds, selectedAttributeOptionIds, debouncedSearch, priceRange, minRating, inStock, isPreorder, sortBy]);

  const totalCount = allProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return allProducts.slice(start, start + pageSize);
  }, [allProducts, safePage, pageSize]);

  const activeFilterCount = [
    !hideCategoryFilter && selectedCategoryIds.length > 0,
    selectedCollectionIds.length > 0,
    selectedAttributeOptionIds.length > 0,
    priceRange.min !== undefined || priceRange.max !== undefined,
    minRating !== undefined,
    inStock,
    isPreorder,
    debouncedSearch,
  ].filter(Boolean).length;

  const clearAll = useCallback(() => {
    if (!hideCategoryFilter) setSelectedCategoryIds([]);
    setSelectedCollectionIds([]);
    setSelectedAttributeOptionIds([]);
    setPriceRange({});
    setMinRating(undefined);
    setInStock(false);
    setIsPreorder(false);
    setSearch("");
    setDebouncedSearch("");
    setSortBy("newest");
    setPage(1);
    if (!hideCategoryFilter) sessionStorage.removeItem("productFilters");
  }, [hideCategoryFilter]);

  const handleCustomPrice = useCallback(() => {
    const min = customMinPrice ? Number(customMinPrice) : undefined;
    const max = customMaxPrice ? Number(customMaxPrice) : undefined;
    if (min !== undefined || max !== undefined) {
      setPriceRange({ min, max });
      setPage(1);
    }
  }, [customMinPrice, customMaxPrice]);

  const toggleCategory = useCallback((id: number) => {
    setSelectedCategoryIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setPage(1);
  }, []);

  const toggleCollection = useCallback((id: number) => {
    setSelectedCollectionIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setPage(1);
  }, []);

  const toggleAttributeOption = useCallback((id: number) => {
    setSelectedAttributeOptionIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    setPage(1);
  }, []);

  const toggleDropdown = useCallback((key: string) => {
    setActiveDropdown((prev) => (prev === key ? null : key));
  }, []);

  const closeDropdown = useCallback(() => setActiveDropdown(null), []);

  const getVisibleCount = useCallback((key: string) => visibleCount[key] || DEFAULT_VISIBLE, [visibleCount]);

  const showMoreItems = useCallback((key: string) => {
    setVisibleCount((prev) => ({ ...prev, [key]: (prev[key] || DEFAULT_VISIBLE) + 10 }));
  }, []);

  const openMobileFilter = useCallback(() => {
    setMobileTemp({
      categoryIds: [...selectedCategoryIds],
      collectionIds: [...selectedCollectionIds],
      attributeOptionIds: [...selectedAttributeOptionIds],
      minPrice: priceRange.min,
      maxPrice: priceRange.max,
      minRating,
      inStock,
      isPreorder,
    });
    setMobileFilterOpen(true);
  }, [selectedCategoryIds, selectedCollectionIds, selectedAttributeOptionIds, priceRange, minRating, inStock, isPreorder]);

  const applyMobileFilters = useCallback(() => {
    setSelectedCategoryIds(mobileTemp.categoryIds);
    setSelectedCollectionIds(mobileTemp.collectionIds);
    setSelectedAttributeOptionIds(mobileTemp.attributeOptionIds);
    setPriceRange({ min: mobileTemp.minPrice, max: mobileTemp.maxPrice });
    setMinRating(mobileTemp.minRating);
    setInStock(mobileTemp.inStock);
    setIsPreorder(mobileTemp.isPreorder);
    setPage(1);
    setMobileFilterOpen(false);
  }, [mobileTemp]);

  const toggleMobileCategory = useCallback((id: number) => {
    setMobileTemp((prev) => ({
      ...prev,
      categoryIds: prev.categoryIds.includes(id) ? prev.categoryIds.filter((x) => x !== id) : [...prev.categoryIds, id],
    }));
  }, []);

  const toggleMobileCollection = useCallback((id: number) => {
    setMobileTemp((prev) => ({
      ...prev,
      collectionIds: prev.collectionIds.includes(id) ? prev.collectionIds.filter((x) => x !== id) : [...prev.collectionIds, id],
    }));
  }, []);

  const toggleMobileAttributeOption = useCallback((id: number) => {
    setMobileTemp((prev) => ({
      ...prev,
      attributeOptionIds: prev.attributeOptionIds.includes(id) ? prev.attributeOptionIds.filter((x) => x !== id) : [...prev.attributeOptionIds, id],
    }));
  }, []);

  const renderPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else if (safePage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("ellipsis");
      pages.push(totalPages);
    } else if (safePage >= totalPages - 3) {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("ellipsis");
      for (let i = safePage - 1; i <= safePage + 1; i++) pages.push(i);
      pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  function renderCheckboxList(
    key: string,
    items: { id: number; label: string }[],
    selectedIds: number[],
    onToggle: (id: number) => void
  ) {
    const searchText = filterSearch[key] || "";
    const filtered = searchText ? items.filter((i) => i.label.toLowerCase().includes(searchText.toLowerCase())) : items;
    const limit = getVisibleCount(key);
    const visible = filtered.slice(0, limit);
    const remaining = filtered.length - limit;

    return (
      <div className="p-3">
        {items.length > 8 && (
          <div className="relative mb-2">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-outline">search</span>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={searchText}
              onChange={(e) => setFilterSearch((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full border border-outline-variant pl-8 pr-2 py-1.5 text-sm font-body-md bg-transparent focus:outline-none focus:border-primary"
            />
          </div>
        )}
        <ul className="space-y-1 max-h-48 overflow-y-auto filter-scroll">
          {(searchText ? filtered : visible).map((item) => (
            <li key={item.id}>
              <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} className="accent-primary border border-outline w-4 h-4" />
                <span className="font-body-md text-body-md whitespace-nowrap">{item.label}</span>
              </label>
            </li>
          ))}
        </ul>
        {!searchText && remaining > 0 && (
          <button onClick={() => showMoreItems(key)} className="mt-2 font-label-caps text-label-caps text-primary hover:underline">
            + Xem thêm {remaining} lựa chọn
          </button>
        )}
      </div>
    );
  }

  function renderFilterTrigger(label: string, key: string, isActive: boolean) {
    const isOpen = activeDropdown === key;
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); toggleDropdown(key); }}
          className={`flex items-center gap-1.5 font-label-caps text-label-caps px-3 py-2 border transition-colors whitespace-nowrap ${
            isOpen ? "border-primary text-primary bg-surface-container" : isActive ? "border-primary text-primary" : "border-transparent text-on-surface-variant hover:border-outline-variant"
          }`}
        >
          {label}
          {isActive && selectedCount(key) > 0 && (
            <span className="bg-primary text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{selectedCount(key)}</span>
          )}
          <span className={`material-symbols-outlined text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>expand_more</span>
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 bg-surface border border-outline-variant shadow-lg min-w-[220px]">
            {renderDropdownContent(key)}
          </div>
        )}
      </div>
    );
  }

  function selectedCount(key: string): number {
    if (key === "category") return selectedCategoryIds.length;
    if (key === "collection") return selectedCollectionIds.length;
    if (key === "price") return priceRange.min !== undefined || priceRange.max !== undefined ? 1 : 0;
    if (key === "rating") return minRating !== undefined ? 1 : 0;
    if (key === "status") return (inStock ? 1 : 0) + (isPreorder ? 1 : 0);
    if (key.startsWith("attr-")) {
      const attrId = Number(key.replace("attr-", ""));
      return selectedAttributeOptionIds.filter((oid) => { const attr = attributes.find((a) => a.id === attrId); return attr?.options.some((o) => o.id === oid); }).length;
    }
    return 0;
  }

  function renderDropdownContent(key: string) {
    if (!hideCategoryFilter && key === "category") return renderCheckboxList("category", categories.map((c) => ({ id: c.id, label: c.name })), selectedCategoryIds, toggleCategory);
    if (key === "collection") return renderCheckboxList("collection", collections.map((c) => ({ id: c.id, label: c.name })), selectedCollectionIds, toggleCollection);
    if (key.startsWith("attr-")) {
      const attrId = Number(key.replace("attr-", ""));
      const attr = attributes.find((a) => a.id === attrId);
      if (!attr) return null;
      return renderCheckboxList(key, attr.options.map((o) => ({ id: o.id, label: o.value })), selectedAttributeOptionIds, toggleAttributeOption);
    }
    if (key === "price") {
      return (
        <div className="p-3 min-w-[200px]">
          <div className="flex items-center gap-2">
            <input type="text" inputMode="numeric" placeholder="Từ" value={customMinPrice} onChange={(e) => setCustomMinPrice(e.target.value)} className="w-full border-b border-outline focus:border-primary focus:ring-0 text-sm py-1 bg-transparent placeholder:text-outline font-body-md" />
            <span className="text-outline font-body-md">—</span>
            <input type="text" inputMode="numeric" placeholder="Đến" value={customMaxPrice} onChange={(e) => setCustomMaxPrice(e.target.value)} className="w-full border-b border-outline focus:border-primary focus:ring-0 text-sm py-1 bg-transparent placeholder:text-outline font-body-md" />
            <button onClick={() => { handleCustomPrice(); closeDropdown(); }} className="font-label-caps text-label-caps px-3 py-1.5 bg-primary text-on-primary hover:opacity-90 transition-opacity">OK</button>
          </div>
        </div>
      );
    }
    if (key === "rating") {
      const options = [{ label: "Tất cả", value: undefined }, { label: "Từ 4 sao trở lên", value: 4 }, { label: "Từ 3 sao trở lên", value: 3 }];
      return (
        <div className="p-3 min-w-[160px]">
          <ul className="space-y-1.5">
            {options.map((opt) => (
              <li key={String(opt.value)}>
                <label className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                  <input type="radio" name="rating-dropdown" checked={minRating === opt.value} onChange={() => { setMinRating(opt.value); setPage(1); closeDropdown(); }} className="accent-primary border border-outline w-4 h-4" />
                  <span className="font-body-md text-body-md whitespace-nowrap">{opt.label}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    if (key === "status") {
      return (
        <div className="p-3 min-w-[160px]">
          <ul className="space-y-1.5">
            <li><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={inStock} onChange={() => { setInStock(!inStock); setPage(1); }} className="accent-primary border border-outline w-4 h-4" /><span className="font-body-md text-body-md whitespace-nowrap">Còn hàng</span></label></li>
            <li><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={isPreorder} onChange={() => { setIsPreorder(!isPreorder); setPage(1); }} className="accent-primary border border-outline w-4 h-4" /><span className="font-body-md text-body-md whitespace-nowrap">Đặt trước</span></label></li>
          </ul>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="pb-section-padding px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      {/* Back link */}
      {backLink && (
        <div className="pt-12 pb-4">
          <Link href={backLink.href} className="font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors">
            ← {backLink.label}
          </Link>
        </div>
      )}

      {/* Page Title */}
      <div className="mb-12 mt-4">
        <h1 className="font-headline-lg text-headline-lg mb-2">{title}</h1>
        {subtitle && <p className="font-body-lg text-body-lg text-on-surface-variant">{subtitle}</p>}
      </div>

      {/* ═══ DESKTOP FILTER BAR ═══ */}
      <div ref={filterBarRef} className="relative">
        {/* Row 1: base filters + sort */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {!hideCategoryFilter && categories.length > 0 && renderFilterTrigger("DANH MỤC", "category", selectedCategoryIds.length > 0)}
          {collections.length > 0 && renderFilterTrigger("BỘ SƯU TẬP", "collection", selectedCollectionIds.length > 0)}
          {renderFilterTrigger("KHOẢNG GIÁ", "price", priceRange.min !== undefined || priceRange.max !== undefined)}
          {renderFilterTrigger("ĐÁNH GIÁ", "rating", minRating !== undefined)}
          {renderFilterTrigger("TÌNH TRẠNG", "status", inStock || isPreorder)}
          <select value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} className="bg-transparent border-none font-label-caps text-label-caps text-on-surface-variant focus:ring-0 cursor-pointer pl-1 pr-4 ml-auto">
            <option value="newest">MỚI NHẤT</option>
            <option value="best_selling">PHỔ BIẾN</option>
            <option value="price_asc">GIÁ: THẤP ĐẾN CAO</option>
            <option value="price_desc">GIÁ: CAO ĐẾN THẤP</option>
            <option value="most_viewed">XEM NHIỀU NHẤT</option>
            <option value="rating">ĐÁNH GIÁ CAO NHẤT</option>
            <option value="name_asc">TÊN A-Z</option>
          </select>
        </div>
        {/* Row 2: attribute filters */}
        {attributes.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {attributes.map((attr) => (
              <Fragment key={`attr-filters-${attr.id}`}>
                {renderFilterTrigger(attr.name.toUpperCase(), `attr-${attr.id}`, selectedAttributeOptionIds.some((oid) => attr.options.some((o) => o.id === oid)))}
              </Fragment>
            ))}
          </div>
        )}
        {/* Row 3: product count + clear all */}
        <div className="flex items-center justify-end gap-2 mb-4">
          <span className="font-label-caps text-label-caps text-on-surface-variant whitespace-nowrap">
            {loading ? "ĐANG TẢI..." : `${totalCount} SẢN PHẨM`}
          </span>
          {mounted && activeFilterCount > 0 && (
            <button onClick={clearAll} className="font-label-caps text-label-caps text-secondary border border-secondary/50 hover:bg-secondary/10 px-4 py-1.5 text-xs whitespace-nowrap transition-colors">XÓA TẤT CẢ</button>
          )}
        </div>
        <div className="hidden md:block border-t border-outline-variant pt-4 mb-2"/>
      </div>

      {/* Toolbar (mobile filter + active chips) */}
      <div className="md:hidden flex flex-wrap items-center gap-2 mb-8 pb-4 border-b border-outline-variant">
        <button onClick={openMobileFilter} className="font-label-caps text-label-caps text-primary border border-primary px-3 py-1.5 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-base">filter_list</span>
          Bộ lọc
          {mounted && activeFilterCount > 0 && <span className="bg-primary text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>}
        </button>
            {mounted && activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
            {selectedCategoryIds.map((id) => { const cat = categories.find((c) => c.id === id); return <span key={`cat-${id}`} className="font-label-caps text-label-caps text-on-surface-variant px-2 py-0.5 bg-surface-container text-[10px] flex items-center gap-1">{cat?.name || `#${id}`}<button onClick={() => toggleCategory(id)} className="material-symbols-outlined text-[10px] hover:text-primary">close</button></span>; })}
            {selectedCollectionIds.map((id) => { const col = collections.find((c) => c.id === id); return <span key={`col-${id}`} className="font-label-caps text-label-caps text-on-surface-variant px-2 py-0.5 bg-surface-container text-[10px] flex items-center gap-1">{col?.name || `#${id}`}<button onClick={() => toggleCollection(id)} className="material-symbols-outlined text-[10px] hover:text-primary">close</button></span>; })}
            {selectedAttributeOptionIds.map((id) => { let label = `#${id}`; for (const attr of attributes) { const opt = attr.options.find((o) => o.id === id); if (opt) { label = opt.value; break; } } return <span key={`opt-${id}`} className="font-label-caps text-label-caps text-on-surface-variant px-2 py-0.5 bg-surface-container text-[10px] flex items-center gap-1">{label}<button onClick={() => toggleAttributeOption(id)} className="material-symbols-outlined text-[10px] hover:text-primary">close</button></span>; })}
            {(priceRange.min !== undefined || priceRange.max !== undefined) && <span className="font-label-caps text-label-caps text-on-surface-variant px-2 py-0.5 bg-surface-container text-[10px] flex items-center gap-1">Khoảng giá<button onClick={() => { setPriceRange({}); setPage(1); }} className="material-symbols-outlined text-[10px] hover:text-primary">close</button></span>}
            {minRating !== undefined && <span className="font-label-caps text-label-caps text-on-surface-variant px-2 py-0.5 bg-surface-container text-[10px] flex items-center gap-1">Từ {minRating}★<button onClick={() => { setMinRating(undefined); setPage(1); }} className="material-symbols-outlined text-[10px] hover:text-primary">close</button></span>}
            {inStock && <span className="font-label-caps text-label-caps text-on-surface-variant px-2 py-0.5 bg-surface-container text-[10px] flex items-center gap-1">Còn hàng<button onClick={() => setInStock(false)} className="material-symbols-outlined text-[10px] hover:text-primary">close</button></span>}
            {isPreorder && <span className="font-label-caps text-label-caps text-on-surface-variant px-2 py-0.5 bg-surface-container text-[10px] flex items-center gap-1">Đặt trước<button onClick={() => setIsPreorder(false)} className="material-symbols-outlined text-[10px] hover:text-primary">close</button></span>}
            {activeFilterCount > 0 && <button onClick={clearAll} className="font-label-caps text-label-caps text-[10px] underline hover:text-primary">Xóa tất cả</button>}
          </div>
        )}
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {Array.from({ length: pageSize }).map((_, i) => <div key={i} className="animate-pulse"><div className="aspect-[4/5] bg-surface-container mb-4" /><div className="h-3 bg-surface-container rounded w-1/3 mb-2" /><div className="h-4 bg-surface-container rounded w-2/3 mb-2" /><div className="h-4 bg-surface-container rounded w-1/4" /></div>)}
        </div>
      ) : pagedProducts.length > 0 ? (
        <>
          <ProductGrid products={pagedProducts} />
          {totalPages > 1 && (
            <div className="mt-20 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-outline-variant pt-8">
              <div className="flex items-center gap-4">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Hiển thị</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="bg-transparent border border-outline-variant px-2 py-1 font-label-caps text-label-caps text-on-surface-variant focus:ring-0">
                  {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <span className="font-label-caps text-label-caps text-on-surface-variant">/ {totalCount} sản phẩm</span>
              </div>
              <div className="flex items-center gap-6">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="material-symbols-outlined text-outline hover:text-primary transition-colors disabled:opacity-30">chevron_left</button>
                <div className="flex items-center gap-6">
                  {renderPageNumbers().map((p, i) => p === "ellipsis" ? <span key={`e-${i}`} className="text-label-caps text-outline">...</span> : <button key={p} onClick={() => setPage(p)} className={`font-label-caps text-label-caps transition-colors ${safePage === p ? "text-primary border-b border-primary" : "text-outline hover:text-primary"}`}>{String(p).padStart(2, "0")}</button>)}
                </div>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="material-symbols-outlined text-outline hover:text-primary transition-colors disabled:opacity-30">chevron_right</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <span className="material-symbols-outlined text-5xl text-outline mb-4">inventory_2</span>
          <p className="font-body-md text-body-md text-on-surface-variant">Không tìm thấy sản phẩm nào.</p>
          <button onClick={clearAll} className="mt-4 px-6 py-2 bg-primary text-on-primary font-label-caps text-label-caps tracking-widest uppercase hover:opacity-90 transition-opacity">Xoá tất cả bộ lọc</button>
        </div>
      )}

      {/* ═══ MOBILE FILTER DRAWER ═══ */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileFilterOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant shrink-0">
              <h3 className="font-headline-md text-headline-md text-primary">Bộ lọc</h3>
              <button onClick={() => setMobileFilterOpen(false)} className="material-symbols-outlined text-on-surface-variant hover:text-primary">close</button>
            </div>
            <div className="overflow-y-auto px-4 py-2 flex-1">
              {!hideCategoryFilter && categories.length > 0 && <MobileFilterSection title="DANH MỤC" items={categories.map((c) => ({ id: c.id, label: c.name }))} selectedIds={mobileTemp.categoryIds} onToggle={toggleMobileCategory} />}
              {collections.length > 0 && <MobileFilterSection title="BỘ SƯU TẬP" items={collections.map((c) => ({ id: c.id, label: c.name }))} selectedIds={mobileTemp.collectionIds} onToggle={toggleMobileCollection} />}
              {attributes.map((attr) => <MobileFilterSection key={attr.id} title={attr.name.toUpperCase()} items={attr.options.map((o) => ({ id: o.id, label: o.value }))} selectedIds={mobileTemp.attributeOptionIds} onToggle={toggleMobileAttributeOption} />)}
              <div className="border-b border-outline-variant pb-4">
                <button onClick={() => {}} className="flex items-center justify-between w-full font-label-caps text-label-caps text-primary py-3">KHOẢNG GIÁ</button>
                <div className="flex items-center gap-2 pl-1">
                  <input type="text" inputMode="numeric" placeholder="Từ" value={customMinPrice} onChange={(e) => setCustomMinPrice(e.target.value)} className="w-full border-b border-outline focus:border-primary focus:ring-0 text-sm py-1 bg-transparent placeholder:text-outline font-body-md" />
                  <span className="text-outline font-body-md">—</span>
                  <input type="text" inputMode="numeric" placeholder="Đến" value={customMaxPrice} onChange={(e) => setCustomMaxPrice(e.target.value)} className="w-full border-b border-outline focus:border-primary focus:ring-0 text-sm py-1 bg-transparent placeholder:text-outline font-body-md" />
                </div>
              </div>
              <div className="border-b border-outline-variant pb-4">
                <button onClick={() => {}} className="flex items-center justify-between w-full font-label-caps text-label-caps text-primary py-3">ĐÁNH GIÁ</button>
                <ul className="space-y-2 pl-1">
                  {[{ label: "Tất cả", value: undefined }, { label: "Từ 4 sao trở lên", value: 4 }, { label: "Từ 3 sao trở lên", value: 3 }].map((opt) => (
                    <li key={String(opt.value)}><label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="mobile-rating" checked={mobileTemp.minRating === opt.value} onChange={() => setMobileTemp((prev) => ({ ...prev, minRating: opt.value }))} className="accent-primary border border-outline w-4 h-4" /><span className="font-body-md text-body-md">{opt.label}</span></label></li>
                  ))}
                </ul>
              </div>
              <div className="border-b border-outline-variant pb-4">
                <button onClick={() => {}} className="flex items-center justify-between w-full font-label-caps text-label-caps text-primary py-3">TÌNH TRẠNG</button>
                <ul className="space-y-2 pl-1">
                  <li><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mobileTemp.inStock} onChange={() => setMobileTemp((prev) => ({ ...prev, inStock: !prev.inStock }))} className="accent-primary border border-outline w-4 h-4" /><span className="font-body-md text-body-md">Còn hàng</span></label></li>
                  <li><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={mobileTemp.isPreorder} onChange={() => setMobileTemp((prev) => ({ ...prev, isPreorder: !prev.isPreorder }))} className="accent-primary border border-outline w-4 h-4" /><span className="font-body-md text-body-md">Đặt trước</span></label></li>
                </ul>
              </div>
            </div>
            <div className="shrink-0 border-t border-outline-variant p-4 bg-background">
              <button onClick={applyMobileFilters} className="w-full bg-primary text-on-primary font-label-caps text-label-caps py-3 tracking-widest hover:opacity-90 transition-opacity">Áp dụng ({totalCount} sản phẩm)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsPageContent(props: Props) {
  return (
    <Suspense fallback={
      <div className="pb-section-padding px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
        <div className="animate-pulse">
          <div className="h-12 bg-surface-container rounded w-1/2 mb-4" />
          <div className="h-6 bg-surface-container rounded w-1/3 mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
            {Array.from({ length: 6 }).map((_, i) => <div key={i}><div className="aspect-[4/5] bg-surface-container mb-4" /><div className="h-3 bg-surface-container rounded w-1/3 mb-2" /><div className="h-4 bg-surface-container rounded w-2/3 mb-2" /><div className="h-4 bg-surface-container rounded w-1/4" /></div>)}
          </div>
        </div>
      </div>
    }>
      <ProductsPageContentMain {...props} />
    </Suspense>
  );
}
