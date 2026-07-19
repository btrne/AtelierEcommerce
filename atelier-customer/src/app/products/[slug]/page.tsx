"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { products as productsApi, cart as cartApi, wishlist as wishlistApi, reviews as reviewsApi, recommendations as recommendationsApi, combos as combosApi, isAuthenticated } from "@/lib/api";
import { track } from "@/lib/tracking";
import type { ProductDetailCustomerDto, ProductVariantDto, ReviewDto, ProductComboCustomerDto } from "@/lib/types";
import { formatCurrency, formatDate } from "@/utils/format";
import { useToast } from "@/components/Toast";

interface AttributeGroup {
  attributeId: number;
  attributeName: string;
  options: { optionId: number; optionValue: string }[];
}

function getAttributeGroups(variants: ProductVariantDto[]): AttributeGroup[] {
  const map = new Map<number, AttributeGroup>();
  for (const v of variants) {
    if (!v.attributes) continue;
    for (const a of v.attributes) {
      if (!map.has(a.attributeId)) {
        map.set(a.attributeId, { attributeId: a.attributeId, attributeName: a.attributeName, options: [] });
      }
      const group = map.get(a.attributeId)!;
      if (!group.options.some(o => o.optionId === a.optionId)) {
        group.options.push({ optionId: a.optionId, optionValue: a.optionValue });
      }
    }
  }
  return Array.from(map.values());
}

function findMatchingVariants(selections: Record<number, number>, variants: ProductVariantDto[]): ProductVariantDto[] {
  const entries = Object.entries(selections);
  if (entries.length === 0) return variants;
  return variants.filter(v => {
    if (!v.attributes) return false;
    return entries.every(([attrId, optId]) =>
      v.attributes!.some(a => a.attributeId === Number(attrId) && a.optionId === optId)
    );
  });
}

function getSelectedVariant(selections: Record<number, number>, variants: ProductVariantDto[]): ProductVariantDto | null {
  return variants.find(v => {
    if (!v.attributes || v.attributes.length === 0) return false;
    return v.attributes.every(a => selections[a.attributeId] === a.optionId);
  }) || null;
}

function getAvailableOptionIds(attributeId: number, selections: Record<number, number>, variants: ProductVariantDto[]): Set<number> {
  const others: Record<number, number> = {};
  for (const [key, value] of Object.entries(selections)) {
    if (Number(key) !== attributeId) {
      others[Number(key)] = value;
    }
  }
  const matching = findMatchingVariants(others, variants);
  const ids = new Set<number>();
  for (const v of matching) {
    if (!v.attributes) continue;
    for (const a of v.attributes) {
      if (a.attributeId === attributeId) {
        ids.add(a.optionId);
      }
    }
  }
  return ids;
}

function isCompleteSelection(selections: Record<number, number>, groups: AttributeGroup[]): boolean {
  return groups.every(g => selections[g.attributeId] !== undefined);
}

function findBestPartialMatch(selections: Record<number, number>, variants: ProductVariantDto[]): ProductVariantDto | null {
  const entries = Object.entries(selections);
  if (entries.length === 0) return variants[0] || null;
  let best: ProductVariantDto | null = null;
  let bestScore = -1;
  for (const v of variants) {
    if (!v.attributes) continue;
    const score = v.attributes.filter(a => selections[a.attributeId] === a.optionId).length;
    if (score > bestScore) { bestScore = score; best = v; }
  }
  return best;
}

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const toast = useToast();
  const [product, setProduct] = useState<ProductDetailCustomerDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [attributeSelections, setAttributeSelections] = useState<Record<number, number>>({});
  const [selectedSkuVariantId, setSelectedSkuVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [fbtProducts, setFbtProducts] = useState<any[]>([]);
  const [combos, setCombos] = useState<ProductComboCustomerDto[]>([]);
  const trackedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    if (trackedSlug.current === slug) return;
    trackedSlug.current = slug;
    setLoading(true);
    productsApi.bySlug(slug)
      .then((data) => {
        if (!data) return;
        setProduct(data);
        if (data.variants.length > 0) {
          const first = data.variants[0];
          if (first.attributes && first.attributes.length > 0) {
            const initial: Record<number, number> = {};
            for (const a of first.attributes) {
              initial[a.attributeId] = a.optionId;
            }
            setAttributeSelections(initial);
          } else {
            setSelectedSkuVariantId(first.id);
          }
        }
        track("view_product", "Product", data.id);
        recommendationsApi.similarProducts(data.id, 20)
          .then((res) => setRelatedProducts(res || []))
          .catch(() => {});
        recommendationsApi.frequentlyBoughtTogether(data.id, 5)
          .then((res) => setFbtProducts(res || []))
          .catch(() => {});
        combosApi.forProduct(data.id)
          .then((res) => setCombos((res || []).filter(c => c.isAvailable)))
          .catch(() => {});
        reviewsApi.list(data.id)
          .then((res) => setReviews(res.items))
          .catch(() => {});
        if (isAuthenticated()) {
          reviewsApi.canReview(data.id)
            .then((res) => setCanReview(res.canReview))
            .catch(() => setCanReview(false));
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-padding">
        <div className="animate-pulse grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-5 aspect-[4/5] bg-surface-container-low" />
          <div className="lg:col-span-7 lg:pl-12 space-y-6">
            <div className="h-4 bg-surface-container-low w-1/4" />
            <div className="h-14 bg-surface-container-low w-3/4" />
            <div className="h-10 bg-surface-container-low w-1/3" />
            <div className="h-24 bg-surface-container-low w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-padding text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Sản phẩm không tồn tại</p>
      </div>
    );
  }

  const attrGroups = getAttributeGroups(product.variants);
  const isAttributeMode = attrGroups.length > 0;

  const variant = isAttributeMode
    ? getSelectedVariant(attributeSelections, product.variants)
    : (product.variants.find(v => v.id === selectedSkuVariantId) ?? product.variants[0] ?? null);

  const isFullySelected = !isAttributeMode || isCompleteSelection(attributeSelections, attrGroups);

  const displayVariant = variant ?? findBestPartialMatch(attributeSelections, product.variants);
  const price = displayVariant ? displayVariant.price : (product.variants[0]?.price ?? 0);
  const stock = variant ? variant.stockQuantity : 0;
  const images = displayVariant ? displayVariant.images : (product.variants[0]?.images ?? []);

  async function handleAddToCart() {
    if (!product) return;
    if (isAttributeMode) {
      if (!isCompleteSelection(attributeSelections, attrGroups)) {
        toast.showToast("Vui lòng chọn đầy đủ phân loại", "warning");
        return;
      }
      if (!variant) {
        toast.showToast("Phân loại này hiện không có sẵn", "warning");
        return;
      }
    } else if (!selectedSkuVariantId && product.variants.length > 0) {
      toast.showToast("Vui lòng chọn phân loại", "warning");
      return;
    }
    try {
      await cartApi.add({ productVariantId: isAttributeMode ? variant!.id : (selectedSkuVariantId || 0), quantity });
      toast.showToast("Đã thêm vào giỏ hàng", "success");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Thêm thất bại", "error");
    }
  }

  async function handleToggleWishlist() {
    if (!product) return;
    try {
      await wishlistApi.add(product.id);
      toast.showToast("Đã thêm vào danh sách yêu thích", "success");
    } catch { }
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated()) {
      toast.showToast("Vui lòng đăng nhập để đánh giá", "warning");
      return;
    }
    if (!product) return;
    setSubmittingReview(true);
    try {
      await reviewsApi.createByProduct({ productId: product.id, stars: reviewForm.rating, comment: reviewForm.comment });
      toast.showToast("Đã gửi đánh giá", "success");
      setReviewForm({ rating: 5, comment: "" });
      setCanReview(false);
      const res = await reviewsApi.list(product.id);
      setReviews(res.items);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Gửi đánh giá thất bại", "error");
    } finally {
      setSubmittingReview(false);
    }
  }

  const mainImage = images[currentImage] || variant?.thumbnailUrl || null;

  return (
    <div>
      {/* Product Section */}
      <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-16 grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        {/* Image Gallery */}
        <div className="lg:col-span-5 flex flex-col md:flex-row-reverse gap-3">
          <div className="flex-grow aspect-[4/5] overflow-hidden bg-surface-container">
            {mainImage ? (
              <img
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                src={mainImage}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-label-caps text-label-caps">NO IMAGE</div>
            )}
          </div>
          {images.length > 1 && (
            <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-y-auto no-scrollbar md:w-20 shrink-0">
              {images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setCurrentImage(i)}
                  className={`w-16 md:w-full aspect-[4/5] bg-surface-container cursor-pointer overflow-hidden transition-colors ${
                    i === currentImage ? "border border-primary" : "border border-transparent hover:border-outline"
                  }`}
                >
                  <img alt="" className={`w-full h-full object-cover ${i === currentImage ? "grayscale-0" : "grayscale hover:grayscale-0"} transition`} src={img} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="lg:col-span-7 flex flex-col gap-6 lg:pl-12">
          <div>
            <Link href={`/collections/${product.collectionSlug}`} className="font-label-caps text-label-caps text-secondary btn-hover-line">
              {product.collectionName || product.categoryName}
            </Link>
            <h1 className="font-headline-lg text-headline-lg mb-3 mt-1">{product.name}</h1>
            <p className="text-[32px] leading-[1.3] text-secondary font-semibold">{formatCurrency(price)}</p>
            {(product.shortDescription || product.description) && (
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed mt-4">
                {product.shortDescription || product.description}
              </p>
            )}
          </div>

          {/* Variants */}
          {(() => {
            if (isAttributeMode) {
              const selectedOptionValues = attrGroups
                .map(g => {
                  const optId = attributeSelections[g.attributeId];
                  if (optId === undefined) return null;
                  const opt = g.options.find(o => o.optionId === optId);
                  return opt?.optionValue;
                })
                .filter(Boolean)
                .join(", ");

              return (
                <div className="space-y-5">
                  <span className="font-label-caps text-label-caps block">
                    Phân loại: <span className="text-on-surface ml-2">{selectedOptionValues || "—"}</span>
                  </span>
                  {attrGroups.map(group => {
                    const availableIds = getAvailableOptionIds(group.attributeId, attributeSelections, product.variants);
                    return (
                      <div key={group.attributeId}>
                        <span className="font-label-caps text-label-caps block mb-3">{group.attributeName}</span>
                        <div className="flex flex-wrap gap-3">
                          {group.options.map(opt => {
                            const isSelected = attributeSelections[group.attributeId] === opt.optionId;
                            const isAvailable = availableIds.has(opt.optionId);
                            return (
                              <button
                                key={opt.optionId}
                                onClick={() => {
                                  if (!isAvailable) return;
                                  setAttributeSelections(prev => ({ ...prev, [group.attributeId]: opt.optionId }));
                                  setCurrentImage(0);
                                }}
                                disabled={!isAvailable}
                                className={`px-5 py-2 rounded-full font-body-md text-body-md border transition-colors ${
                                  isSelected
                                    ? "border-secondary text-secondary"
                                    : isAvailable
                                      ? "border-outline-variant text-on-surface hover:border-secondary hover:text-secondary"
                                      : "border-outline-variant text-on-surface-variant opacity-40 cursor-not-allowed"
                                }`}
                              >
                                {opt.optionValue}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            if (product.variants.length > 1) {
              return (
                <div>
                  <span className="font-label-caps text-label-caps block mb-4">
                    Phân loại: <span className="text-on-surface ml-2">{product.variants.find(v => v.id === selectedSkuVariantId)?.sku || ""}</span>
                  </span>
                  <div className="flex gap-4">
                    {product.variants.map(v => (
                      <button
                        key={v.id}
                        onClick={() => { setSelectedSkuVariantId(v.id); setCurrentImage(0); }}
                        className={`px-6 py-3 font-button-text text-button-text border transition-colors ${
                          selectedSkuVariantId === v.id ? "bg-primary text-on-primary border-primary" : "border-outline-variant text-primary hover:border-primary"
                        }`}
                      >
                        {v.sku}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }

            return null;
          })()}

          {/* Actions */}
          <div className="flex flex-col gap-4">
            <button
              onClick={handleAddToCart}
              disabled={stock === 0 || !isFullySelected}
              className="w-full h-14 bg-primary text-white font-button-text text-button-text uppercase tracking-[0.2em] hover:bg-on-surface-variant transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {!isFullySelected ? "Vui lòng chọn phân loại" : stock === 0 ? "Hết hàng" : "Thêm Vào Giỏ Hàng"}
            </button>
            {isAuthenticated() && (
              <button
                onClick={handleToggleWishlist}
                className="w-full h-14 border border-secondary text-secondary font-button-text text-button-text uppercase tracking-[0.2em] hover:bg-secondary hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined align-middle text-[18px]">favorite_border</span>
                Yêu thích
              </button>
            )}
          </div>

          {/* Trust Badges */}
          <div className="border-t border-outline-variant pt-8 flex items-center justify-end gap-6">
            <span className="font-label-caps text-label-caps flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Bảo hành trọn đời
            </span>
            <span className="font-label-caps text-label-caps flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">local_shipping</span>
              Miễn phí vận chuyển
            </span>
          </div>
        </div>
      </section>

      {/* Heritage Section */}
      <section className="py-12 bg-surface-container-low overflow-hidden">
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 max-w-5xl mx-auto">
            <div className="order-2 lg:order-1 flex-1">
              <div>
                <p className="font-label-caps text-label-caps text-secondary mb-2 tracking-[0.4em] uppercase">Nghệ Thuật Thủ Công</p>
                <h2 className="font-headline-md text-headline-md mb-3 leading-tight">Triết lý Atelier: Tỉ mỉ đến từng chi tiết nhỏ nhất</h2>
              </div>
              <div className="space-y-4 max-w-xl">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  {product.story || product.shortDescription || product.description}
                </p>
              </div>
              <div className="mt-6">
                <div className="border-t border-outline-variant mb-6"></div>
                <div className="flex flex-wrap gap-6">
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
            <div className="order-1 lg:order-2 lg:w-1/4 relative">
              <div className="aspect-[3/4] overflow-hidden">
                <img
                  alt="Nghệ thuật chế tác"
                  className="w-full h-full object-cover"
                  src={images[0] || variant?.thumbnailUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCp-l16AwP6qnAvY0w7qEje5eTMoAP7fM0ilOpPdL-oks5JcSvlc7Db6xvTkCgqLsfjlnNva6_LWXGn8Vrz0S9q_GLLH4qoba-qEDF0uQV3xPJ5jEs_0_Ekei3UfBhXR7pa49ne50YngtJLJOQExSE60NjZMx6TOgYmjAXLeUOb6JY6ejEaTxO4shF6WT-cK9AhAQTs6x-csswVRxoZWDL180gXVmtou8i_PV9TSk_yX-vTEGMCMH1CCspCZisy8zcQ7pORKi8ylRrU'}
                />
              </div>
              <div className="absolute -bottom-2 -left-2 hidden md:block w-16 aspect-square border-[4px] border-surface shadow-xl">
                <img
                  alt="Chi tiết phụ kiện"
                  className="w-full h-full object-cover"
                  src={images[1] || images[0] || variant?.thumbnailUrl || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBVVhPUWlcKqwpAIm1j_20LSCQEfb1M4oMIBmaOLRC_Sk8-Gayt4PG5LBYoRgVBTD8pc7nfBneKc27Fx2odZIzenGfC0oIeC7T0ju6gyJ1wT-Mi_kye_dMEH9KBTao7cMM4ReaOsuWrvOEn8wyxPutTfamsKvoV0_IMUUzaTyFwXHm45if9pc4UiMj5FlQAxPNf_iDQJ_VoNYuDQCl2Rx6FMFeTUy3-pMbNKY-MsJpQPxOE5IjLOpmTXUH_MbaNKaBuTtMM44Oy97In'}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      {(reviews.length > 0 || canReview) && (
        <section className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop py-section-padding">
          <div className="flex items-baseline justify-between mb-12">
            <h2 className="font-headline-lg text-headline-lg text-primary">Đánh giá</h2>
            {reviews.length > 0 && (
              <span className="font-label-caps text-label-caps text-on-surface-variant">{reviews.length} đánh giá</span>
            )}
          </div>

          {isAuthenticated() && canReview && (
            <form onSubmit={handleSubmitReview} className="mb-12 border border-outline-variant p-8">
              <h3 className="font-label-caps text-label-caps text-primary mb-6">Viết đánh giá</h3>
              <div className="flex items-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setReviewForm({ ...reviewForm, rating: star })} className="hover:opacity-60 transition-opacity">
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: star <= reviewForm.rating ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
                    >
                      star
                    </span>
                  </button>
                ))}
              </div>
              <textarea
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                placeholder="Chia sẻ cảm nhận của bạn..."
                className="w-full border-b border-outline-variant px-0 py-3 font-body-md bg-transparent focus:outline-none focus:border-primary min-h-[100px] resize-none"
              />
              <div className="mt-6">
                <button type="submit" disabled={submittingReview || !reviewForm.comment} className="bg-primary text-on-primary px-10 py-3.5 font-button-text text-button-text tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
                  {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          )}

          {reviews.length > 0 && (
            <div className="space-y-8 max-w-2xl">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-outline-variant pb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-body-md font-semibold text-primary">{review.userName}</span>
                    <span className="font-label-caps text-label-caps text-on-surface-variant">{formatDate(review.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className="material-symbols-outlined text-sm"
                        style={{ fontVariationSettings: star <= review.stars ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
                      >
                        star
                      </span>
                    ))}
                  </div>
                  <p className="font-body-md text-on-surface-variant leading-relaxed">{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Frequently Bought Together (Apriori) */}
      {fbtProducts.length > 0 && (
        <section className="py-section-padding bg-surface">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <h2 className="font-headline-lg text-headline-lg text-center mb-16">Thường được mua cùng</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
              {fbtProducts.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="group cursor-pointer">
                  <div className="aspect-[4/5] overflow-hidden bg-surface-container relative mb-4">
                    {p.thumbnailUrl ? (
                      <img alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={p.thumbnailUrl} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-label-caps text-label-caps">NO IMAGE</div>
                    )}
                  </div>
                  <h4 className="font-label-caps text-label-caps mb-1 uppercase">{p.name}</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">{formatCurrency(p.minPrice)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Combo Deals */}
      {combos.length > 0 && (
        <section className="py-section-padding bg-surface">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <h2 className="font-headline-lg text-headline-lg text-center mb-16">Combo tiết kiệm</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {combos.map((combo) => (
                <div key={combo.id} className="bg-surface-container rounded-2xl p-6 border border-outline-variant/20">
                  <h3 className="font-headline-sm text-headline-sm mb-4">{combo.name}</h3>
                  {combo.description && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-4">{combo.description}</p>
                  )}
                  <div className="space-y-3 mb-4">
                    {combo.products.map((p) => (
                      <Link key={p.id} href={`/products/${p.slug}`} className="flex items-center gap-3 group">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container-high flex-shrink-0">
                          {p.thumbnailUrl ? (
                            <img alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" src={p.thumbnailUrl} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-on-surface-variant text-[10px]">NO</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-body-sm text-body-sm truncate group-hover:text-primary transition">{p.name}</p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">{formatCurrency(p.minPrice)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-outline-variant/20 pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body-sm text-body-sm text-on-surface-variant line-through">{formatCurrency(combo.originalTotalPrice)}</span>
                      <span className="font-body-lg text-body-lg font-semibold text-primary">{formatCurrency(combo.comboPrice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-label-caps text-label-caps text-on-primary bg-primary-container px-2 py-0.5 rounded-full">
                        {combo.discountType === "Percentage" ? `-${combo.discountValue}%` : `-${formatCurrency(combo.discountValue)}`}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        Tiết kiệm {formatCurrency(combo.originalTotalPrice - combo.comboPrice)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      for (const p of combo.products) {
                        try {
                          const detail = await productsApi.detail(p.id);
                          if (detail && detail.variants && detail.variants.length > 0) {
                            const defaultVariant = detail.variants.find((v: any) => v.isDefault) || detail.variants[0];
                            await cartApi.add({ productVariantId: defaultVariant.id, quantity: 1 });
                          }
                        } catch {}
                      }
                      await combosApi.applyToCart(combo.id);
                      toast.showToast(`Đã thêm combo "${combo.name}" vào giỏ hàng`, "success");
                      window.dispatchEvent(new Event("cart-updated"));
                    }}
                    className="w-full mt-4 bg-primary text-on-primary py-3 rounded-full font-label-caps text-label-caps hover:opacity-90 transition"
                  >
                    Thêm combo vào giỏ
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Products (KNN) */}
      {relatedProducts.length > 0 && (
        <section className="py-section-padding bg-surface-container-low">
          <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
            <h2 className="font-headline-lg text-headline-lg text-center mb-16">Có thể bạn sẽ thích</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-8 gap-y-12">
              {relatedProducts.map((p) => (
                <Link key={p.id} href={`/products/${p.slug}`} className="group cursor-pointer">
                  <div className="aspect-[4/5] overflow-hidden bg-surface-container relative mb-4">
                    {p.thumbnailUrl ? (
                      <img alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={p.thumbnailUrl} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-label-caps text-label-caps">NO IMAGE</div>
                    )}
                  </div>
                  <h4 className="font-label-caps text-label-caps mb-1 uppercase">{p.name}</h4>
                  <p className="font-body-md text-body-md text-on-surface-variant">{formatCurrency(p.minPrice)}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      
    </div>
  );
}
