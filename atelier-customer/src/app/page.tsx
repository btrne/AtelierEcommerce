"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { products as productsApi, collections as collectionsApi, categories as categoriesApi } from "@/lib/api";
import type { ProductCustomerDto, CollectionDto, CategoryDto } from "@/lib/types";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<ProductCustomerDto[]>([]);
  const [bestSellerProducts, setBestSellerProducts] = useState<ProductCustomerDto[]>([]);
  const [newestProducts, setNewestProducts] = useState<ProductCustomerDto[]>([]);
  const [collections, setCollections] = useState<CollectionDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryImages, setCategoryImages] = useState<Record<number, string>>({});
  const [collectionProducts, setCollectionProducts] = useState<ProductCustomerDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      productsApi.list({ isFeatured: true }),
      productsApi.list(),
      collectionsApi.list(),
      categoriesApi.list(),
    ])
      .then(async ([featured, allProducts, colRes, catRes]) => {
        const all = allProducts || [];
        const featuredArr = featured || [];
        const colArr = colRes || [];
        const catArr = catRes || [];

        // Featured products: isFeatured=true, sorted by totalSold desc (best seller first)
        const sortedFeatured = [...featuredArr].sort((a, b) => b.totalSold - a.totalSold);
        setFeaturedProducts(sortedFeatured.slice(0, 5));

        // Best sellers: all products sorted by totalSold descending
        const sortedBySold = [...all].sort((a, b) => b.totalSold - a.totalSold);
        setBestSellerProducts(sortedBySold.slice(0, 5));

        // Newest products: all products sorted by id descending (newest first)
        const sortedByNewest = [...all].sort((a, b) => b.id - a.id);
        setNewestProducts(sortedByNewest.slice(0, 5));

        // Collections sorted by product count descending (best selling collections)
        const sortedCollections = [...colArr].sort((a, b) => b.productCount - a.productCount);
        setCollections(sortedCollections);

        // Category images: find best-selling product's thumbnail for each category
        const catImageMap: Record<number, string> = {};
        for (const cat of catArr) {
          try {
            const catProducts = await productsApi.list({ categoryId: cat.id });
            if (catProducts && catProducts.length > 0) {
              const sortedCat = [...catProducts].sort((a, b) => b.totalSold - a.totalSold);
              const best = sortedCat[0];
              if (best.thumbnailUrl) {
                catImageMap[cat.id] = best.thumbnailUrl;
              }
            }
          } catch {}
        }
        setCategoryImages(catImageMap);

        setCategories(catArr);

        // Fetch products for top 2 collections
        const topCollections = sortedCollections.slice(0, 2);
        const colProductMap: ProductCustomerDto[] = [];
        for (const col of topCollections) {
          if (col.slug) {
            try {
              const colRes = await productsApi.byCollection(col.slug, { pageSize: 5 });
              if (colRes && colRes.items) {
                colProductMap.push(...colRes.items);
              }
            } catch {}
          }
        }
        setCollectionProducts(colProductMap);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const heroCollection = collections[0];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[calc(100vh-148px)] min-h-[600px] overflow-hidden bg-primary-container">
        <img
          alt={heroCollection?.name || 'ATELIER Collection'}
          className="w-full h-full object-cover"
          src={heroCollection?.bannerImageUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCG38-Cl6zQNZDVrd0TK6R9s8-HzZlktQNLoV6OHS79K3mo330LUVxr23bN_UjytIxMHsv7E0Cj9vx7l4W5l7QETpWf5eRimrNwLTLuAuLSG5F8PYCqxpzEFBNOLOLK_vP79CVwuASPuK5LLGnXg9B1seGVe1l3M0rfaWyILwdZVfnUBECVUTI8PiN0Y_HTJd2RNkwpq9kBQIU-g6mi8s617WjhatqBygbQ4CeBFAIcITTppCSjH2lgGObrWxhpwQNwXPCsWz8MoPAB'}
        />
        <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center text-center px-margin-mobile">
          <div className="max-w-4xl">
            <p className="font-label-caps text-label-caps text-white mb-6 tracking-[0.4em] uppercase">Giới thiệu</p>
            <h1 className="font-headline-xl text-headline-xl text-white mb-10 leading-[1.1] md:text-[80px]">
              {heroCollection?.name || 'Bộ Sưu Tập'}<br />
            </h1>
            <Link href="/products" className="inline-block bg-white text-primary px-12 py-5 font-button-text text-button-text uppercase tracking-widest hover:bg-secondary hover:text-white transition-all duration-500">
              Khám Phá Ngay
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Section - Images from best-selling products of each category */}
      {categories && categories.length > 0 && (
        <section className="py-section-padding bg-surface">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {(categories || []).slice(0, 3).map((cat, idx) => (
                <Link
                  key={cat.id}
                  href={`/category/${cat.slug}`}
                  className={`group relative overflow-hidden aspect-[3/4] text-left block ${idx === 1 ? 'md:mt-24' : ''}`}
                >
                  <img
                    alt={cat.name}
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                    src={categoryImages[cat.id] || 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwuF0NGou0jsBNS4WVWNqu7UNvDvzAdBKzI87eLB3EMN3CL_t01aDf1kZ1zug_cQS-I1m8gUjss_Z3zaC1VdWMvVs8ZGPvOnpS5x7JQi7x4IyR9V1KbHz0qH_zz-eXaVZAAn_i9DCQsNVMfNt5IGflrczyBupI1CwhnuzjL_C3szSF15P3ONfXc7udrE0LxrmU20_aJE3bOrROpWt1BgSyuc1lSQHqYXciYx7oNjrM3gKYEt4s1OSiRGCGMQmMmt_NrgOA3TeCHwfE'}
                  />
                  <div className="absolute bottom-10 left-10 text-white z-10">
                    <h3 className="font-headline-md text-headline-md mb-2">{cat.name}</h3>
                    <span className="font-label-caps text-label-caps border-b border-white pb-1">Xem Chi Tiết</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Featured Products - Sorted by best seller first (totalSold desc) */}
      <section className="py-section-padding bg-surface-container-lowest">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-20">
            <h2 className="font-headline-lg text-headline-lg text-primary">Sản Phẩm Nổi Bật</h2>
            <Link href="/products" className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] btn-hover-line mt-4 md:mt-0">
              Xem tất cả sản phẩm
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full max-w-[214px] mx-auto animate-pulse">
                    <div className="aspect-[4/5] bg-surface-container mb-4" />
                    <div className="h-4 bg-surface-container rounded w-3/4 mb-2" />
                    <div className="h-4 bg-surface-container rounded w-1/2" />
                  </div>
                ))
              : (featuredProducts || []).slice(0, 5).map((product) => (
                  <div key={product.id} className="w-full max-w-[214px] mx-auto">
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Newest Products */}
      <section className="py-section-padding bg-surface">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col md:flex-row justify-between items-baseline mb-20">
            <h2 className="font-headline-lg text-headline-lg text-primary">Sản phẩm mới nhất</h2>
            <Link href="/products" className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] btn-hover-line mt-4 md:mt-0">
              Xem tất cả sản phẩm
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full max-w-[214px] mx-auto animate-pulse">
                    <div className="aspect-[4/5] bg-surface-container mb-4" />
                    <div className="h-4 bg-surface-container rounded w-3/4 mb-2" />
                    <div className="h-4 bg-surface-container rounded w-1/2" />
                  </div>
                ))
              : (newestProducts || []).slice(0, 5).map((product) => (
                  <div key={product.id} className="w-full max-w-[214px] mx-auto">
                    <ProductCard product={product} />
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      {bestSellerProducts.length > 0 && (
        <section className="py-section-padding bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="flex flex-col md:flex-row justify-between items-baseline mb-20">
              <h2 className="font-headline-lg text-headline-lg text-primary">Sản phẩm bán chạy</h2>
              <Link href="/products" className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] btn-hover-line mt-4 md:mt-0">
                Xem tất cả sản phẩm
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
              {loading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-full max-w-[214px] mx-auto animate-pulse">
                      <div className="aspect-[4/5] bg-surface-container mb-4" />
                      <div className="h-4 bg-surface-container rounded w-3/4 mb-2" />
                      <div className="h-4 bg-surface-container rounded w-1/2" />
                    </div>
                  ))
                : (bestSellerProducts || []).slice(0, 5).map((product) => (
                    <div key={product.id} className="w-full max-w-[214px] mx-auto">
                      <ProductCard product={product} />
                    </div>
                  ))}
            </div>
          </div>
        </section>
      )}

      {/* Heritage/Craftsmanship Section */}
      <section className="py-16 bg-surface-container-low overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-10 max-w-5xl mx-auto">
            <div className="order-2 lg:order-1 flex-1">
              <div>
                <p className="font-label-caps text-label-caps text-secondary mb-3 tracking-[0.4em] uppercase">Nghệ Thuật Thủ Công</p>
                <h2 className="font-headline-lg text-headline-lg mb-5 leading-tight">Triết lý Atelier: Tỉ mỉ đến từng chi tiết nhỏ nhất</h2>
              </div>
              <div className="space-y-6 max-w-xl">
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Tại Atelier, chúng tôi tin rằng mỗi chiếc túi là một tác phẩm nghệ thuật sống động. Được chế tác từ những miếng da thượng hạng nhất được tuyển chọn thủ công từ Ý và Pháp, mỗi sản phẩm đều trải qua hàng trăm giờ làm việc tỉ mỉ của những nghệ nhân lành nghề nhất.
                </p>
                <p className="font-body-lg text-body-lg text-on-surface-variant">
                  Quy trình khâu tay hoàn toàn (saddle stitch) không chỉ mang lại độ bền vĩnh cửu mà còn là biểu tượng của sự tận tụy và kiên nhẫn—những giá trị cốt lõi của nghệ thuật thủ công truyền thống.
                </p>
              </div>
              <div className="mt-8">
                <div className="border-t border-outline-variant mb-6"></div>
                <div className="flex flex-wrap gap-8">
                  <div>
                    <h4 className="font-headline-md text-headline-md mb-2">350+</h4>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">Tác Phẩm</p>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-headline-md mb-2">12</h4>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">Nghệ Nhân Bậc Thầy</p>
                  </div>
                  <div>
                    <h4 className="font-headline-md text-headline-md mb-2">100%</h4>
                    <p className="font-label-caps text-label-caps text-on-surface-variant">Da Nhập Khẩu</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2 lg:w-1/3 relative">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  alt="Nghệ thuật chế tác"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCp-l16AwP6qnAvY0w7qEje5eTMoAP7fM0ilOpPdL-oks5JcSvlc7Db6xvTkCgqLsfjlnNva6_LWXGn8Vrz0S9q_GLLH4qoba-qEDF0uQV3xPJ5jEs_0_Ekei3UfBhXR7pa49ne50YngtJLJOQExSE60NjZMx6TOgYmjAXLeUOb6JY6ejEaTxO4shF6WT-cK9AhAQTs6x-csswVRxoZWDL180gXVmtou8i_PV9TSk_yX-vTEGMCMH1CCspCZisy8zcQ7pORKi8ylRrU"
                />
              </div>
              <div className="absolute -bottom-3 -left-3 hidden md:block w-20 aspect-square border-[6px] border-surface shadow-xl">
                <img
                  alt="Chi tiết phụ kiện"
                  className="w-full h-full object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBVVhPUWlcKqwpAIm1j_20LSCQEfb1M4oMIBmaOLRC_Sk8-Gayt4PG5LBYoRgVBTD8pc7nfBneKc27Fx2odZIzenGfC0oIeC7T0ju6gyJ1wT-Mi_kye_dMEH9KBTao7cMM4ReaOsuWrvOEn8wyxPutTfamsKvoV0_IMUUzaTyFwXHm45if9pc4UiMj5FlQAxPNf_iDQJ_VoNYuDQCl2Rx6FMFeTUy3-pMbNKY-MsJpQPxOE5IjLOpmTXUH_MbaNKaBuTtMM44Oy97In"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bespoke Section */}
      <section className="py-section-padding bg-primary text-white">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop text-center">
          <h2 className="font-headline-lg text-headline-lg mb-8">Dịch Vụ Cá Nhân Hóa</h2>
          <p className="font-headline-sm text-headline-sm mb-12 max-w-2xl mx-auto opacity-80">Kiến tạo nên dấu ấn riêng của bạn trên từng đường kim mũi chỉ. Lựa chọn màu da, loại chỉ và yêu cầu khắc tên riêng theo phong cách độc bản.</p>
          <button className="border border-white/40 px-12 py-5 font-button-text text-button-text uppercase tracking-widest hover:bg-white hover:text-primary transition-all duration-500">Đặt Lịch Hẹn Tư Vấn</button>
        </div>
      </section>
    </div>
  );
}