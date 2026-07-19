"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cart as cartApi, auth, combos as combosApi, products as productsApi } from "@/lib/api";
import type { CartDto } from "@/lib/types";
import { formatCurrency } from "@/utils/format";
import { useToast } from "@/components/Toast";

export default function CartPage() {
  const router = useRouter();
  const toast = useToast();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  const loadCart = useCallback(async () => {
    try {
      const data = await cartApi.get();
      setCart(data);
    } catch { }
  }, []);

  useEffect(() => {
    loadCart().finally(() => setLoading(false));
  }, [loadCart]);

  async function handleUpdateQuantity(itemId: number, quantity: number) {
    if (quantity < 1) return;
    if (!cart) return;
    try {
      setCart({
        ...cart,
        items: cart.items.map((i) => i.id === itemId ? { ...i, quantity } : i),
        totalPrice: recalcTotal(cart, itemId, quantity),
      });
      await cartApi.updateQuantity(itemId, quantity);
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Cập nhật thất bại", "error");
      loadCart();
    }
  }

  async function handleRemove(itemId: number) {
    if (!cart) return;
    setRemovingIds((prev) => new Set(prev).add(itemId));
    setTimeout(async () => {
      try {
        await cartApi.remove(itemId);
        await loadCart();
      } catch (err: unknown) {
        toast.showToast(err instanceof Error ? err.message : "Xóa thất bại", "error");
        loadCart();
      } finally {
        setRemovingIds((prev) => { const next = new Set(prev); next.delete(itemId); return next; });
      }
    }, 400);
  }

  function recalcTotal(currentCart: CartDto, changedId: number, newQty: number): number {
    let total = 0;
    for (const item of currentCart.items) {
      if (item.id === changedId) {
        total += item.unitPrice * newQty;
      } else {
        total += item.unitPrice * item.quantity;
      }
    }
    return total;
  }

  if (loading) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-10 pb-section-padding animate-pulse">
        <div className="h-12 bg-surface-container-low rounded w-1/3 mb-6" />
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="flex-grow space-y-8">
            {[1, 2].map((i) => (
              <div key={i} className="h-32 bg-surface-container-low rounded" />
            ))}
          </div>
          <div className="w-full lg:w-[400px]">
            <div className="h-64 bg-surface-container-low rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-10 pb-section-padding text-center">
        <header className="mb-12">
          <h1 className="font-headline-xl text-headline-xl mb-4">Giỏ Hàng Trống</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mb-8">
            Hãy thêm sản phẩm vào giỏ hàng của bạn
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 font-button-text text-button-text text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
            TIẾP TỤC MUA SẮM
          </Link>
        </header>
      </div>
    );
  }

  const subtotal = cart.totalPrice;
  const appliedCombo = cart.appliedCombo;
  const comboDiscount = appliedCombo ? appliedCombo.discountAmount : 0;
  const finalTotal = subtotal - comboDiscount;

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-10 pb-section-padding">
      <header className="mb-16">
        <h1 className="font-headline-xl text-headline-xl">Giỏ hàng</h1>
        <div className="mt-4">
          <Link
            href="/products"
            className="group inline-flex items-center gap-2 font-label-caps text-label-caps text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
            TIẾP TỤC MUA SẮM
          </Link>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-16">
        {/* Cart Items */}
        <div className="flex-grow min-w-0">
          {/* Column Headers (Desktop) */}
          <div className="hidden md:grid grid-cols-[120px_1fr_150px_150px] gap-6 border-b border-outline-variant pb-4 mb-8">
            <span className="font-label-caps text-label-caps text-on-surface-variant">SẢN PHẨM</span>
            <span />
            <span className="font-label-caps text-label-caps text-on-surface-variant text-center">SỐ LƯỢNG</span>
            <span className="font-label-caps text-label-caps text-on-surface-variant text-right">TỔNG CỘNG</span>
          </div>

          {cart.items.map((item) => (
            <div
              key={item.id}
              className={`relative grid grid-cols-[120px_1fr_auto] md:grid-cols-[120px_1fr_150px_150px] gap-6 items-center border-b border-outline-variant py-8 transition-all duration-400 ${
                removingIds.has(item.id) ? "opacity-0 translate-x-5" : "opacity-100 translate-x-0"
              }`}
            >
              <button
                onClick={() => handleRemove(item.id)}
                className="absolute top-3 -right-1 z-10 w-8 h-8 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>

              {/* Image */}
              <div className="aspect-[4/5] bg-surface-container-low overflow-hidden">
                <img
                  src={item.productImage || "/placeholder.svg"}
                  alt={item.productName}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Info */}
              <div className="flex flex-col justify-center min-w-0">
                <Link
                  href={`/products/${item.productId}`}
                  className="font-body-lg text-body-lg font-medium hover:text-secondary transition-colors truncate"
                >
                  {item.productName}
                </Link>
                {item.variantInfo && (
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">{item.variantInfo}</p>
                )}
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center justify-center border border-outline-variant h-10 w-32 mx-auto md:mx-0">
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                  className="px-4 h-full hover:bg-surface-container transition-colors text-body-md"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  readOnly
                  className="w-10 text-center border-none focus:ring-0 bg-transparent font-body-md text-body-md pointer-events-none"
                />
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                  className="px-4 h-full hover:bg-surface-container transition-colors text-body-md"
                >
                  +
                </button>
              </div>

              {/* Total Price */}
              <div className="text-right">
                <span className="font-body-md text-body-md font-semibold">
                  {formatCurrency(item.unitPrice * item.quantity)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <aside className="w-full lg:w-[400px]">
          <div className="bg-surface-container-low p-8 sticky top-[120px]">
            <h2 className="font-headline-md text-headline-md mb-8">Tóm tắt đơn hàng</h2>

            {/* Applied Combo */}
            {appliedCombo && (
              <div className="mb-6 bg-primary-container rounded-lg p-4">
                <p className="font-body-sm text-body-sm text-on-primary-container font-semibold">
                  Combo {appliedCombo.comboName}
                </p>
                <p className="font-body-sm text-body-sm text-on-primary-container mt-1">
                  Đã áp dụng - Tiết kiệm {formatCurrency(comboDiscount)}
                </p>
                <p className="font-body-xs text-on-primary-container mt-1">
                  Giá combo: {formatCurrency(appliedCombo.comboPrice)} (thay vì {formatCurrency(appliedCombo.originalPrice)})
                </p>
              </div>
            )}

            {/* Suggested Combos */}
            {!appliedCombo && cart.suggestedCombos.length > 0 && (
              <div className="mb-6 space-y-3">
                {cart.suggestedCombos.map((combo) => (
                  <div key={combo.comboId} className="bg-inverse-surface rounded-lg p-4">
                    <p className="font-body-sm text-body-sm text-inverse-on-surface font-semibold">
                      {combo.allItemsInCart ? "🎉 Giỏ hàng đủ combo" : `💡 Đang có ${combo.matchingCount}/${combo.totalCount} SP`}
                      {" "}{combo.comboName}
                    </p>
                    <p className="font-body-sm text-body-sm text-inverse-on-surface mt-1">
                      Tiết kiệm {formatCurrency(combo.discountAmount)}
                    </p>
                    {!combo.allItemsInCart && (
                      <p className="font-body-xs text-inverse-on-surface mt-1">
                        Thêm {combo.totalCount - combo.matchingCount} SP còn thiếu để nhận combo
                      </p>
                    )}
                    <button
                      onClick={async () => {
                        try {
                          if (!combo.allItemsInCart) {
                            const comboDetail = await combosApi.forProduct(0).catch(() => []);
                            const missingIds = cart.suggestedCombos
                              .find((c) => c.comboId === combo.comboId);
                            const cartProductIds = cart.items.map((i) => i.productId);
                            const allCombos = await combosApi.checkCart(cartProductIds);
                            const found = allCombos.applicableCombos.find((c) => c.comboId === combo.comboId);
                            if (found && found.missingProductIds.length > 0) {
                              for (const pid of found.missingProductIds) {
                                try {
                                  const detail = await productsApi.detail(pid);
                                  if (detail && detail.variants && detail.variants.length > 0) {
                                    const dv = detail.variants.find((v: any) => v.isDefault) || detail.variants[0];
                                    await cartApi.add({ productVariantId: dv.id, quantity: 1 });
                                  }
                                } catch {}
                              }
                            }
                          }
                          await combosApi.applyToCart(combo.comboId);
                          await loadCart();
                          toast.showToast("Đã áp dụng combo", "success");
                        } catch (err: unknown) {
                          toast.showToast(err instanceof Error ? err.message : "Lỗi", "error");
                        }
                      }}
                      className="mt-2 px-4 py-2 bg-surface text-on-surface rounded-full font-body-sm text-body-sm hover:opacity-90 transition"
                    >
                      {combo.allItemsInCart ? "Áp dụng combo" : "Thêm SP & áp dụng combo"}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center">
                <span className="font-body-md text-on-surface-variant">Tạm tính</span>
                <span className="font-body-md">{formatCurrency(subtotal)}</span>
              </div>
              {comboDiscount > 0 && (
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-on-surface-variant">Combo ({appliedCombo?.comboName})</span>
                  <span className="font-body-md text-secondary font-medium italic">-{formatCurrency(comboDiscount)}</span>
                </div>
              )}
            </div>

            <div className="border-t border-outline-variant pt-6 mb-10">
              <div className="flex justify-between items-baseline">
                <span className="font-label-caps text-label-caps">TỔNG CỘNG</span>
                <span className="font-headline-md text-headline-md">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full bg-primary text-on-primary py-6 font-button-text text-button-text uppercase tracking-[0.2em] hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-3"
            >
              Tiến hành thanh toán
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>

            <div className="mt-8 space-y-4">
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">verified</span>
                <p className="text-[12px] text-on-surface-variant">
                  Sản phẩm thủ công chính hãng với chứng nhận bảo hành 2 năm.
                </p>
              </div>
              <div className="flex items-start gap-4">
                <span className="material-symbols-outlined text-on-surface-variant">local_shipping</span>
                <p className="text-[12px] text-on-surface-variant">
                  Vận chuyển cao cấp miễn phí cho mọi đơn hàng nội địa.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
