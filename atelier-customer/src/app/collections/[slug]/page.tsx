"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { collections as collectionsApi, products as productsApi, recommendations as recommendationsApi } from "@/lib/api";
import type { CollectionDto, ProductCustomerDto, CollectionRecommendationDto } from "@/lib/types";
import CollectionCard from "@/components/CollectionCard";

export default function CollectionDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [collection, setCollection] = useState<CollectionDto | null>(null);
  const [products, setProducts] = useState<ProductCustomerDto[]>([]);
  const [relatedCollections, setRelatedCollections] = useState<CollectionRecommendationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const loadData = async () => {
      try {
        const allCols = await collectionsApi.list();
        const col = allCols.find((c) => c.slug === slug) || null;
        setCollection(col);

        if (col) {
          const res = await productsApi.list({ collectionIds: String(col.id) });
          setProducts(res || []);
          recommendationsApi.collections(col.id, 4)
            .then((recs) => setRelatedCollections(recs || []))
            .catch(() => setRelatedCollections([]));
        }
      } catch (err) {
        console.error("Failed to load collection:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [slug]);

  if (loading) {
    return (
      <div>
        <section className="px-margin-desktop pt-20 pb-12 max-w-container-max mx-auto text-center">
          <div className="h-16 bg-surface-container rounded w-1/3 mx-auto mb-6 animate-pulse" />
          <div className="h-6 bg-surface-container rounded w-2/3 mx-auto max-w-md animate-pulse" />
        </section>
        <section className="px-margin-desktop pb-section-padding max-w-container-max mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-surface-container mb-4" />
                <div className="h-4 bg-surface-container rounded w-2/3 mb-2" />
                <div className="h-4 bg-surface-container rounded w-1/3" />
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (!collection) {
    return (
      <div>
        <section className="px-margin-desktop pt-20 pb-12 max-w-container-max mx-auto text-center">
          <h1 className="font-headline-lg text-headline-lg mb-4 text-primary">Bộ Sưu Tập</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Không tìm thấy bộ sưu tập này.
          </p>
          <Link
            href="/collections"
            className="inline-block mt-8 px-10 py-4 bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary hover:text-white transition-all duration-300"
          >
            Quay lại bộ sưu tập
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div>
      {/* Collection Hero */}
      <section className="relative h-[60vh] min-h-[400px] overflow-hidden">
        {collection.bannerImageUrl ? (
          <img
            className="w-full h-full object-cover"
            src={collection.bannerImageUrl}
            alt={collection.name}
          />
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center">
            <span className="font-headline-xl text-headline-xl text-on-surface-variant">{collection.name}</span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-margin-mobile">
          <h1 className="font-headline-xl text-headline-xl text-white mb-4 uppercase tracking-[0.15em]" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>{collection.name}</h1>
          {collection.description && (
            <p className="font-body-lg text-body-lg text-white/80 max-w-xl mb-2">{collection.description}</p>
          )}
          <p className="font-body-lg text-body-lg text-white/80 max-w-xl">
            {collection.productCount > 0
              ? `${collection.productCount} sản phẩm trong bộ sưu tập`
              : "Bộ sưu tập nổi bật"}
            {collection.releaseDate && ` · Phát hành: ${new Date(collection.releaseDate).toLocaleDateString("vi-VN")}`}
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="px-margin-desktop pt-section-padding pb-section-padding max-w-container-max mx-auto">
        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="group cursor-pointer"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-surface-container mb-4">
                  {product.thumbnailUrl ? (
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      src={product.thumbnailUrl}
                      alt={product.name}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-outline">image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 border border-white/20" />
                </div>
                <h4 className="font-label-caps text-label-caps text-primary mb-1 uppercase truncate">
                  {product.name}
                </h4>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {product.minPrice.toLocaleString("vi-VN")}₫
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <span className="material-symbols-outlined text-5xl text-outline mb-4">inventory_2</span>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Chưa có sản phẩm nào trong bộ sưu tập này.
            </p>
            <Link
              href="/collections"
              className="inline-block mt-6 px-8 py-3 bg-primary text-on-primary font-label-caps text-label-caps hover:bg-secondary hover:text-white transition-all duration-300"
            >
              Khám phá bộ sưu tập khác
            </Link>
          </div>
        )}
      </section>

      {/* Related Collections */}
      {relatedCollections.length > 0 && (
        <section className="py-section-padding bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <h2 className="font-headline-lg text-headline-lg text-center mb-16">Có thể bạn sẽ thích</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-gutter">
              {relatedCollections.map((c) => (
                <CollectionCard key={c.id} collection={c as unknown as CollectionDto} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}