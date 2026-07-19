"use client";

import { useEffect, useState, useRef } from "react";
import { collections as collectionsApi } from "@/lib/api";
import type { CollectionDto } from "@/lib/types";
import CollectionCard from "@/components/CollectionCard";

function CollectionsPage() {
  const [latestCollections, setLatestCollections] = useState<CollectionDto[]>([]);
  const [bestSellers, setBestSellers] = useState<CollectionDto[]>([]);
  const [remainingCollections, setRemainingCollections] = useState<CollectionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Setup reveal observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const loadData = async () => {
      try {
        const [allCols, bestSellersData] = await Promise.all([
          collectionsApi.list(),
          collectionsApi.bestSellers(3),
        ]);

        if (!allCols || allCols.length === 0) {
          setError("Chưa có bộ sưu tập nào.");
          return;
        }

        // Latest 2 collections (sorted by createdAt DESC from API)
        setLatestCollections(allCols.slice(0, 2));

        // Best sellers (3 collections with highest totalSold)
        setBestSellers(bestSellersData || []);

        // Remaining collections: exclude the 2 latest and 3 best sellers
        const latestIds = new Set(allCols.slice(0, 2).map((c) => c.id));
        const bestSellerIds = new Set((bestSellersData || []).map((c) => c.id));
        const remaining = allCols.filter(
          (c) => !latestIds.has(c.id) && !bestSellerIds.has(c.id)
        );
        setRemainingCollections(remaining);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Không thể tải bộ sưu tập";
        console.error("Failed to load collections:", err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Observe reveal elements after data loads (re-run on any render)
  useEffect(() => {
    if (!loading && !initializedRef.current) {
      initializedRef.current = true;
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(() => {
        document.querySelectorAll(".reveal-up").forEach((el) => {
          // Mark as visible immediately so content shows
          el.classList.add("visible");
          observerRef.current?.observe(el);
        });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  if (loading) {
    return (
      <div className="pb-section-padding">
        {/* Loading Skeleton */}
        <section className="px-margin-desktop pt-20 pb-12 max-w-container-max mx-auto text-center">
          <div className="h-16 bg-surface-container rounded w-1/3 mx-auto mb-6 animate-pulse" />
          <div className="h-6 bg-surface-container rounded w-2/3 mx-auto max-w-md animate-pulse" />
        </section>
        <section className="px-margin-desktop pb-section-padding max-w-container-max mx-auto">
          <div className="text-center mb-16">
            <div className="h-4 bg-surface-container rounded w-48 mx-auto mb-4 animate-pulse" />
            <div className="h-10 bg-surface-container rounded w-96 mx-auto animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {[1, 2].map((i) => (
              <div key={i} className="h-[750px] bg-surface-container animate-pulse rounded" />
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-section-padding">
        <section className="px-margin-desktop pt-20 pb-12 max-w-container-max mx-auto text-center">
          <h1 className="font-headline-lg text-headline-lg mb-4 text-primary">Bộ Sưu Tập</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            {error}
          </p>
        </section>
        {/* Consultation CTA */}
        <section className="px-margin-desktop pb-section-padding max-w-container-max mx-auto">
          <div className="border border-outline-variant p-16 text-center max-w-4xl mx-auto">
            <span className="material-symbols-outlined text-secondary text-4xl mb-6">workspace_premium</span>
            <h3 className="font-headline-md text-headline-md text-primary mb-4">Thiết kế theo yêu cầu</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-8">
              Bạn không tìm thấy bộ sưu tập ưng ý? Chúng tôi cung cấp dịch vụ Bespoke để hiện thực hóa ý tưởng của riêng bạn.
            </p>
            <button className="px-10 py-4 bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary hover:text-white transition-all duration-300">
              Đặt lịch tư vấn
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="pb-section-padding">
      {/* Page Hero Header */}
      <section className="px-margin-desktop pt-20 pb-20 max-w-container-max mx-auto text-center reveal-up visible">
        <h1 className="font-headline-xl text-headline-xl mb-4 text-primary">Bộ Sưu Tập</h1>
        <p className="font-body-lg text-body-lg max-w-2xl mx-auto text-on-surface-variant">
          Khám phá thế giới của sự tinh xảo và sang trọng thông qua các bộ sưu tập đặc trưng của chúng tôi.
        </p>
      </section>

      {/* 1. Latest Collections (2 items) */}
      {latestCollections.length > 0 && (
        <section className="px-margin-desktop pb-section-padding max-w-container-max mx-auto reveal-up visible">
          <div className="text-center mb-16">
            <span className="font-label-caps text-label-caps text-secondary mb-4 block">Khám Phá Xu Hướng</span>
            <h2 className="font-headline-lg text-headline-lg text-primary section-title uppercase tracking-widest">
              Bộ sưu tập mới nhất
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            {latestCollections.map((col) => (
              <a
                key={col.id}
                href={col.slug ? `/collections/${col.slug}` : "#"}
                className="gallery-card relative overflow-hidden h-[750px] group block"
              >
                <div className="absolute inset-0 bg-surface-container">
                  {col.bannerImageUrl ? (
                    <img
                      className="gallery-image-zoom absolute inset-0 w-full h-full object-cover"
                      src={col.bannerImageUrl}
                      alt={col.name}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-headline-md text-headline-md text-on-surface-variant">{col.name}</span>
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors duration-500" />
                <div className="absolute inset-0 p-12 flex flex-col justify-end items-center text-center text-white">
                  <span className="font-label-caps text-[10px] tracking-[0.4em] mb-4">
                    {new Date(col.createdAt).getFullYear()}
                  </span>
                  <h3 className="font-headline-lg text-headline-lg mb-6">{col.name}</h3>
                  {col.productCount > 0 && (
                    <p className="font-body-md text-body-md mb-10 max-w-sm opacity-90">
                      {col.productCount} sản phẩm
                    </p>
                  )}
                  <span className="px-12 py-4 bg-white text-primary font-label-caps text-label-caps hover:bg-secondary hover:text-white transition-all duration-500 inline-block">
                    Khám phá
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 2. Best Selling Collections (3 items) */}
      {bestSellers.length > 0 && (
        <section className="bg-surface-container-low py-section-padding reveal-up visible">
          <div className="px-margin-desktop max-w-container-max mx-auto">
            <div className="text-center mb-16">
              <span className="font-label-caps text-label-caps text-secondary mb-4 block">Được Yêu Thích Nhất</span>
              <h2 className="font-headline-lg text-headline-lg text-primary section-title uppercase tracking-widest">
                Bộ sưu tập bán chạy
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {bestSellers.map((col) => (
                <a
                  key={col.id}
                  href={col.slug ? `/collections/${col.slug}` : "#"}
                  className="gallery-card group cursor-pointer block"
                >
                  <div className="relative aspect-[4/5] overflow-hidden mb-6">
                    {col.bannerImageUrl ? (
                      <img
                        className="gallery-image-zoom w-full h-full object-cover"
                        src={col.bannerImageUrl}
                        alt={col.name}
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-container flex items-center justify-center">
                        <span className="font-headline-md text-headline-md text-on-surface-variant">{col.name}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 border border-white/20" />
                  </div>
                  <h4 className="font-headline-md text-[24px] text-primary mb-2 text-center">{col.name}</h4>
                  <p className="font-label-caps text-[10px] text-on-surface-variant text-center tracking-[0.2em]">
                    {col.totalSold > 0 ? `${col.totalSold} đơn hàng đã bán` : "Bộ sưu tập nổi bật"}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. All Remaining Collections */}
      {remainingCollections.length > 0 && (
        <section className="px-margin-desktop py-section-padding max-w-container-max mx-auto reveal-up visible">
          <div className="text-center mb-16">
            <span className="font-label-caps text-label-caps text-secondary mb-4 block">Toàn Bộ Danh Mục</span>
            <h2 className="font-headline-lg text-headline-lg text-primary section-title uppercase tracking-widest">
              Bộ sưu tập hiện có
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {remainingCollections.map((col) => (
              <CollectionCard key={col.id} collection={col} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state: if no collections at all */}
      {latestCollections.length === 0 && bestSellers.length === 0 && remainingCollections.length === 0 && !error && !loading && (
        <section className="px-margin-desktop pb-section-padding max-w-container-max mx-auto text-center">
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Chưa có bộ sưu tập nào được tạo.
          </p>
        </section>
      )}
    </div>
  );
}

export default function CollectionsPageWrapper() {
  return <CollectionsPage />;
}