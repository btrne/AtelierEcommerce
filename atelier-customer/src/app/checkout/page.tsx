"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cart as cartApi, orders as ordersApi, vouchers as vouchersApi, shipping as shippingApi, auth, profile as profileApi, locations as locationsApi, customRequestsApi, combos as combosApi, products as productsApi } from "@/lib/api";
import { track } from "@/lib/tracking";
import type { CartDto, AddressDto, AddressRequest, ActiveVoucherDto, CheckoutItem, ShippingFeeOption, CustomRequestDto } from "@/lib/types";
import { formatCurrency } from "@/utils/format";
import { useToast } from "@/components/Toast";
interface Province { code: string; name: string; }
interface District { code: string; name: string; }
interface Ward { code: string; name: string; }

const PAYMENT_METHODS = [
  { id: 1, label: "Thanh toán khi nhận hàng (COD)", desc: "Trả tiền khi nhận hàng", icon: "payments" },
  { id: 2, label: "Chuyển khoản ngân hàng (VNPay)", desc: "Thanh toán qua VNPay", icon: "account_balance" },
] as const;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [cart, setCart] = useState<CartDto | null>(null);
  const [customRequest, setCustomRequest] = useState<CustomRequestDto | null>(null);
  const [addresses, setAddresses] = useState<AddressDto[]>([]);
  const [activeVouchers, setActiveVouchers] = useState<ActiveVoucherDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userId, setUserId] = useState<number | undefined>();
  const customRequestId = searchParams.get("customRequestId");

  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddressDetail, setShippingAddressDetail] = useState("");

  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);

  const [shippingOptions, setShippingOptions] = useState<ShippingFeeOption[]>([]);
  const [selectedOption, setSelectedOption] = useState(0);
  const [calculatingFee, setCalculatingFee] = useState(false);
  const [feeError, setFeeError] = useState<string | null>(null);
  const [paymentMethodId, setPaymentMethodId] = useState(1);

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<ActiveVoucherDto | null>(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherId, setVoucherId] = useState<number | undefined>();
  const [applyingVoucher, setApplyingVoucher] = useState(false);

  const [appliedCombo, setAppliedCombo] = useState<{ comboId: number; comboName: string; discountAmount: number; comboPrice: number; originalPrice: number } | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressForm, setShowAddAddressForm] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [newAddress, setNewAddress] = useState<AddressRequest>({
    contactName: "", phone: "", detailAddress: "", wardName: "", districtName: "", provinceName: "", isDefault: false,
  });
  const [addingAddress, setAddingAddress] = useState(false);

  const [saveAddress, setSaveAddress] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  const subtotal = customRequest ? (customRequest.quotedPrice ?? 0) : (cart ? cart.totalPrice : 0);
  const currentFee = shippingOptions[selectedOption]?.fee ?? 0;
  const comboDiscount = appliedCombo ? appliedCombo.discountAmount : 0;
  const total = subtotal + currentFee - comboDiscount - voucherDiscount;

  const selectedProvinceName = provinces.find((p) => p.code === selectedProvince)?.name || "";
  const selectedDistrictName = districts.find((d) => d.code === selectedDistrict)?.name || "";
  const selectedWardName = wards.find((w) => w.code === selectedWard)?.name || "";

  const calcShippingFee = useCallback(async () => {
    if (!selectedProvinceName || !selectedDistrictName || !selectedWardName) {
      setShippingOptions([]);
      setFeeError(null);
      return;
    }
    setCalculatingFee(true);
    setFeeError(null);
    try {
      const weight = cart ? cart.items.reduce((sum, item) => sum + 200 * item.quantity, 0) : 500;
      const result = await shippingApi.fee({
        province: selectedProvinceName,
        district: selectedDistrictName,
        ward: selectedWardName,
        weight: Math.max(100, weight),
      });
      const available = result.options.filter((o) => o.isSuccess);
      setShippingOptions(available.length > 0 ? available : [{
        fee: 30000,
        leadTime: 0,
        isSuccess: true,
        errorMessage: null,
        carrierCode: "default",
        serviceName: "Giao hàng tiêu chuẩn",
        description: "3-5 ngày làm việc",
      }]);
      const errors = result.options.filter((o) => !o.isSuccess);
      if (errors.length > 0) setFeeError(errors[0].errorMessage || "Không thể tính phí vận chuyển");
    } catch {
      setFeeError("Không kết nối được GHN API, dùng phí mặc định");
      setShippingOptions([{
        fee: 30000,
        leadTime: 0,
        isSuccess: true,
        errorMessage: null,
        carrierCode: "default",
        serviceName: "Giao hàng tiêu chuẩn",
        description: "3-5 ngày làm việc",
      }]);
    } finally {
      setCalculatingFee(false);
    }
  }, [selectedProvinceName, selectedDistrictName, selectedWardName, cart]);

  useEffect(() => {
    calcShippingFee();
  }, [calcShippingFee]);

  async function loadDistricts(provinceCode: string | null) {
    if (!provinceCode) { setDistricts([]); setSelectedDistrict(null); setWards([]); setSelectedWard(null); return; }
    try {
      const data = await locationsApi.districts(provinceCode);
      setDistricts(data);
    } catch { setDistricts([]); }
    setSelectedDistrict(null);
    setWards([]);
    setSelectedWard(null);
  }

  async function loadWards(districtCode: string | null) {
    if (!districtCode) { setWards([]); setSelectedWard(null); return; }
    try {
      const data = await locationsApi.wards(districtCode);
      setWards(data);
    } catch { setWards([]); }
    setSelectedWard(null);
  }

  useEffect(() => {
    if (!auth.isLoggedIn()) { router.push("/login"); return; }

    const profile = auth.getProfile();
    if (profile) setUserId(profile.id);

    loadInitialData();
  }, []);

  async function loadInitialData() {
    setLoading(true);
    try {
      const [provincesData, addrData, vData] = await Promise.all([
        locationsApi.provinces(),
        profileApi.addresses.list(),
        vouchersApi.getActive(),
      ]);
      setProvinces(provincesData);
      setAddresses(addrData);
      setActiveVouchers(vData);

      if (customRequestId) {
        const cr = await customRequestsApi.detail(Number(customRequestId));
        if (cr.status !== "Confirmed") {
          toast.showToast("Yêu cầu chế tác chưa được xác nhận");
          router.push("/account?tab=bespoke");
          return;
        }
        setCustomRequest(cr);
      } else {
        const cartData = await cartApi.get();
        if (cartData.items.length === 0) { router.push("/cart"); return; }
        setCart(cartData);
        if (cartData.appliedCombo) {
          setAppliedCombo(cartData.appliedCombo);
        }
      }

      const defaultAddr = addrData.find((a) => a.isDefault) || addrData[0];
      if (defaultAddr) await fillAddress(defaultAddr);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function fillAddress(addr: AddressDto) {
    setRecipientName(addr.fullName);
    setRecipientPhone(addr.phoneNumber);
    setShippingAddressDetail(addr.street);
    setSelectedAddressId(addr.id);

    try {
      const province = provinces.find((p: Province) => p.name === addr.city);
      if (province) {
        setSelectedProvince(province.code);
        const districtList = await locationsApi.districts(province.code);
        setDistricts(districtList);
        const district = districtList.find((d: District) => d.name === addr.district);
        if (district) {
          setSelectedDistrict(district.code);
          const wardList = await locationsApi.wards(district.code);
          setWards(wardList);
          const ward = wardList.find((w: Ward) => w.name === addr.ward);
          if (ward) setSelectedWard(ward.code);
        }
      }
    } catch {
      // API provinces down — user will select manually
    }
    setShowAddressModal(false);
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    if (!newAddress.contactName.trim() || !newAddress.phone.trim() || !newAddress.provinceName.trim() || !newAddress.districtName.trim() || !newAddress.wardName.trim() || !newAddress.detailAddress.trim()) {
      toast.showToast("Vui lòng điền đầy đủ thông tin địa chỉ", "warning");
      setAddingAddress(false);
      return;
    }
    setAddingAddress(true);
    try {
      const created = await profileApi.addresses.create(newAddress);
      setAddresses((prev) => [...prev, created]);
      await fillAddress(created);
      setShowAddAddressForm(false);
      setNewAddress({ contactName: "", phone: "", detailAddress: "", wardName: "", districtName: "", provinceName: "", isDefault: false });
      toast.showToast("Đã thêm địa chỉ mới");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Thêm địa chỉ thất bại", "error");
    } finally {
      setAddingAddress(false);
    }
  }

  async function handleSaveAddress() {
    if (!saveAddress || !recipientName || !recipientPhone) return;
    setSavingAddress(true);
    try {
      await profileApi.addresses.create({
        contactName: recipientName,
        phone: recipientPhone,
        detailAddress: shippingAddressDetail,
        wardName: selectedWardName,
        districtName: selectedDistrictName,
        provinceName: selectedProvinceName,
        isDefault: false,
      });
      const updated = await profileApi.addresses.list();
      setAddresses(updated);
      toast.showToast("Đã lưu thông tin giao hàng");
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Lưu thất bại", "error");
    } finally {
      setSavingAddress(false);
    }
  }

  async function handleApplyVoucher(vCode?: string) {
    const code = vCode ?? voucherCode;
    if (!code) return;
    setApplyingVoucher(true);
    try {
      const result = await vouchersApi.apply({ code, orderTotal: subtotal, userId });
      if (result.valid && result.voucherId && result.discount != null) {
        setAppliedVoucher({
          code: result.code ?? code,
          description: undefined,
          discountType: result.discountType ?? "Percentage",
          discountValue: result.discountValue ?? 0,
          minOrderValue: 0,
          maxDiscountValue: result.discount ?? 0,
        });
        setVoucherDiscount(result.discount);
        setVoucherId(result.voucherId);
        toast.showToast(result.message);
      } else {
        toast.showToast(result.message || "Mã giảm giá không hợp lệ");
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Mã giảm giá không hợp lệ", "error");
    } finally {
      setApplyingVoucher(false);
    }
  }

  function handleApplyActiveVoucher(v: ActiveVoucherDto) {
    setVoucherCode(v.code);
    handleApplyVoucher(v.code);
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null);
    setVoucherCode("");
    setVoucherDiscount(0);
    setVoucherId(undefined);
  }

  async function handlePlaceOrder() {
    if (!recipientName || !recipientPhone || !shippingAddressDetail) {
      toast.showToast("Vui lòng nhập đầy đủ thông tin giao hàng", "warning");
      return;
    }
    setSubmitting(true);
    try {
      const cartItems: CheckoutItem[] | undefined = cart
        ? cart.items.map((item) => ({ productVariantId: item.variantId, quantity: item.quantity }))
        : undefined;

      const selectedCarrier = shippingOptions[selectedOption]?.carrierCode;
      const result = await ordersApi.create({
        userId,
        recipientName,
        recipientPhone,
        shippingAddress: shippingAddressDetail,
        shippingProvince: selectedProvinceName,
        shippingDistrict: selectedDistrictName,
        shippingWard: selectedWardName,
        shippingFee: currentFee,
        preferredCarrierCode: selectedCarrier === "default" ? undefined : selectedCarrier,
        paymentMethodId,
        voucherId,
        voucherDiscount: voucherDiscount > 0 ? voucherDiscount : undefined,
        appliedComboId: appliedCombo?.comboId,
        comboDiscount: comboDiscount > 0 ? comboDiscount : undefined,
        cartItems,
        customRequestId: customRequest ? Number(customRequestId) : undefined,
      });

      track("purchase", "Order", result.orderId);

      if (paymentMethodId === 1) {
        if (!customRequestId) {
          await cartApi.clear();
        }
        toast.showToast("Đặt hàng thành công!");
        router.push("/account?tab=orders");
      } else {
        if (!result.paymentUrl) {
          throw new Error("Không thể tạo link thanh toán. Vui lòng thử lại.");
        }
        window.location.href = result.paymentUrl;
      }
    } catch (err: unknown) {
      toast.showToast(err instanceof Error ? err.message : "Đặt hàng thất bại", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-10 pb-section-padding animate-pulse">
        <div className="h-8 bg-surface-container-low rounded w-1/4 mb-8" />
        <div className="flex gap-10 flex-col lg:flex-row">
          <div className="flex-[1.4] space-y-6">
            <div className="h-64 bg-surface-container-low rounded" />
            <div className="h-32 bg-surface-container-low rounded" />
            <div className="h-32 bg-surface-container-low rounded" />
          </div>
          <div className="flex-[1]">
            <div className="h-96 bg-surface-container-low rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!customRequest && !cart) return null;

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-10 pb-section-padding">
      <h1 className="font-headline-lg text-headline-lg mb-12">Thanh toán</h1>

      <div className="flex gap-10 flex-col lg:flex-row">
        {/* Left Column */}
        <div className="flex-[1.4] space-y-12">
          {/* Step 01 - Shipping */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-caps text-[10px]">01</span>
              <h2 className="font-label-caps text-label-caps uppercase">Thông tin vận chuyển</h2>
              {addresses.length > 0 && (
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="ml-auto font-label-caps text-[10px] text-primary btn-hover-line uppercase tracking-widest"
                >
                  Chọn từ địa chỉ đã lưu
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-10">
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">HỌ TÊN</label>
                <input
                  value={recipientName}
                  onChange={(e) => { setRecipientName(e.target.value); setSelectedAddressId(null); }}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors duration-300 border-t-0 border-x-0 px-0"
                />
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">SỐ ĐIỆN THOẠI</label>
                <input
                  value={recipientPhone}
                  onChange={(e) => { setRecipientPhone(e.target.value); setSelectedAddressId(null); }}
                  placeholder="+84 900 000 000"
                  className="w-full bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors duration-300 border-t-0 border-x-0 px-0"
                />
              </div>
              <div className="md:col-span-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">TỈNH / THÀNH PHỐ</label>
                <select
                  value={selectedProvince ?? ""}
                  onChange={(e) => { const code = e.target.value || null; setSelectedProvince(code); setSelectedAddressId(null); loadDistricts(code); }}
                  className="w-full bg-transparent border-b border-outline-variant py-2 font-body-md focus:border-primary transition-colors duration-300 border-t-0 border-x-0 px-0"
                >
                  <option value="">Chọn tỉnh/thành phố</option>
                  {provinces.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">QUẬN / HUYỆN</label>
                <select
                  value={selectedDistrict ?? ""}
                  onChange={(e) => { const code = e.target.value || null; setSelectedDistrict(code); setSelectedAddressId(null); loadWards(code); }}
                  className="w-full bg-transparent border-b border-outline-variant py-2 font-body-md focus:border-primary transition-colors duration-300 border-t-0 border-x-0 px-0"
                  disabled={!selectedProvince}
                >
                  <option value="">Chọn quận/huyện</option>
                  {districts.map((d) => (
                    <option key={d.code} value={d.code}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">PHƯỜNG / XÃ</label>
                <select
                  value={selectedWard ?? ""}
                  onChange={(e) => { setSelectedWard(e.target.value || null); setSelectedAddressId(null); }}
                  className="w-full bg-transparent border-b border-outline-variant py-2 font-body-md focus:border-primary transition-colors duration-300 border-t-0 border-x-0 px-0"
                  disabled={!selectedDistrict}
                >
                  <option value="">Chọn phường/xã</option>
                  {wards.map((w) => (
                    <option key={w.code} value={w.code}>{w.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant block mb-2">ĐỊA CHỈ NHẬN HÀNG</label>
                <input
                  value={shippingAddressDetail}
                  onChange={(e) => { setShippingAddressDetail(e.target.value); setSelectedAddressId(null); }}
                  placeholder="Số nhà, tên đường"
                  className="w-full bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors duration-300 border-t-0 border-x-0 px-0"
                />
              </div>
            </div>

            {/* Save address checkbox */}
            <div className="mt-8 flex items-center gap-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                  className="accent-primary w-4 h-4"
                />
                <span className="font-body-md text-body-sm text-on-surface-variant">Lưu thông tin giao hàng vào sổ địa chỉ</span>
              </label>
              {saveAddress && (
                <button
                  onClick={handleSaveAddress}
                  disabled={savingAddress}
                  className="border border-primary px-4 py-1.5 font-label-caps text-[10px] uppercase tracking-widest text-primary hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-50"
                >
                  {savingAddress ? "Đang lưu..." : "Lưu"}
                </button>
              )}
            </div>
          </section>

          <div className="h-px bg-outline-variant/30 w-full" />

          {/* Step 02 - Shipping Method */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-caps text-[10px]">02</span>
              <h2 className="font-label-caps text-label-caps uppercase">Phương thức giao hàng</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shippingOptions.length === 0 && (
                <div className="col-span-2 border border-outline-variant p-6">
                  <span className="text-on-surface-variant text-sm">Vui lòng chọn địa chỉ giao hàng</span>
                </div>
              )}
              {shippingOptions.map((opt, idx) => (
                <label key={idx} className="group cursor-pointer">
                  <input type="radio" name="shipping" checked={selectedOption === idx} onChange={() => setSelectedOption(idx)} className="hidden peer" />
                  <div className="border border-outline-variant p-6 flex flex-col gap-2 peer-checked:border-primary peer-checked:bg-surface-container-lowest transition-all duration-300">
                    <div className="flex justify-between items-center">
                      <span className="font-body-md font-bold">{opt.serviceName}</span>
                      <span className="font-body-md">
                        {calculatingFee
                          ? "Đang tính..."
                          : opt.fee > 0
                            ? formatCurrency(opt.fee)
                            : "Miễn phí"}
                      </span>
                    </div>
                    <span className="text-on-surface-variant text-sm">{opt.description}</span>
                  </div>
                </label>
              ))}
            </div>
            {feeError && (
              <p className="mt-3 text-xs text-error flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">info</span>
                {feeError}
              </p>
            )}
          </section>

          <div className="h-px bg-outline-variant/30 w-full" />

          {/* Step 03 - Payment Method */}
          <section>
            <div className="flex items-center gap-4 mb-8">
              <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-caps text-[10px]">03</span>
              <h2 className="font-label-caps text-label-caps uppercase">Phương thức thanh toán</h2>
            </div>
            <div className="space-y-4">
              {PAYMENT_METHODS.map((pm) => (
                <label key={pm.id} className="group cursor-pointer block">
                  <input type="radio" name="payment" value={pm.id} checked={paymentMethodId === pm.id} onChange={() => setPaymentMethodId(pm.id)} className="hidden peer" />
                  <div className="border border-outline-variant p-6 flex items-center justify-between peer-checked:border-primary peer-checked:bg-surface-container-lowest transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-primary">{pm.icon}</span>
                      <div>
                        <p className="font-body-md font-bold">{pm.label}</p>
                        <p className="text-on-surface-variant text-sm">{pm.desc}</p>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column - Order Summary */}
        <aside className="flex-[1]">
          <div className="bg-surface-container-low p-8 sticky top-[120px] border border-outline-variant/30">
            <h3 className="font-headline-md text-headline-md mb-8">
              {customRequest ? "Yêu cầu chế tác" : "Giỏ hàng"}
            </h3>

            <div className="space-y-6 mb-8 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {customRequest ? (
                <div className="flex gap-4">
                  {customRequest.imageUrl && (
                    <div className="w-24 h-30 bg-surface flex-shrink-0 overflow-hidden">
                      <img src={customRequest.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex flex-col justify-between py-1 min-w-0">
                    <div>
                      <h4 className="font-body-md font-bold leading-tight">Chế tác riêng</h4>
                      {customRequest.description && (
                        <p className="text-on-surface-variant text-sm line-clamp-2">{customRequest.description}</p>
                      )}
                    </div>
                    <span className="font-body-md">{formatCurrency(customRequest.quotedPrice ?? 0)}</span>
                  </div>
                </div>
              ) : cart ? (
                cart.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-24 h-30 bg-surface flex-shrink-0 overflow-hidden">
                      <img src={item.productImage || "/placeholder.svg"} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex flex-col justify-between py-1 min-w-0">
                      <div>
                        <h4 className="font-body-md font-bold leading-tight truncate">{item.productName}</h4>
                        {item.variantInfo && <p className="text-on-surface-variant text-sm">{item.variantInfo}</p>}
                      </div>
                      <span className="font-body-md">{formatCurrency(item.unitPrice * item.quantity)}</span>
                    </div>
                  </div>
                ))
              ) : null}
            </div>

            <div className="h-px bg-outline-variant/30 w-full mb-8" />

            {/* Vouchers */}
            <div className="space-y-4 mb-6">
              <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">Mã giảm giá / Voucher</label>

              {activeVouchers.length > 0 && (
                <div className="space-y-2">
                  {activeVouchers.slice(0, 3).map((v) => (
                    <div key={v.code} className="border border-outline-variant/30 p-3 bg-surface flex justify-between items-center group hover:border-primary transition-colors gap-4">
                      <div className="space-y-1">
                        <p className="text-base md:text-xl font-semibold uppercase tracking-normal">{v.code}</p>
                        <div className="overflow-hidden max-h-0 group-hover:max-h-20 opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <p className="text-on-surface-variant text-xs font-body-md pt-1">
                            {v.discountType === "Percentage"
                              ? `Giảm ${v.discountValue}% (tối đa ${formatCurrency(v.maxDiscountValue)})`
                              : `Giảm ${formatCurrency(v.discountValue)}`}
                          </p>
                          {v.minOrderValue > 0 && (
                            <p className="text-on-surface-variant text-xs font-body-md">Đơn tối thiểu {formatCurrency(v.minOrderValue)}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleApplyActiveVoucher(v)}
                        disabled={applyingVoucher}
                        className={`font-label-caps text-[11px] border px-4 py-2 transition-all shrink-0 ${
                          appliedVoucher?.code === v.code
                            ? "bg-black text-white border-black"
                            : "border-primary text-primary hover:bg-primary hover:text-on-primary"
                        }`}
                      >
                        ÁP DỤNG
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {appliedVoucher && (
                <div className="flex items-center justify-between bg-primary/5 border border-primary/20 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-xs text-primary">redeem</span>
                    <span className="font-body-md text-xs text-primary">{appliedVoucher.code}</span>
                    <span className="text-on-surface-variant text-xs">-{formatCurrency(voucherDiscount)}</span>
                  </div>
                  <button onClick={handleRemoveVoucher} className="text-on-surface-variant hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-xs">close</span>
                  </button>
                </div>
              )}
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-on-surface-variant">
                <span className="font-body-md text-sm">Tạm tính</span>
                <span className="font-body-md text-sm">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant">
                <span className="font-body-md text-sm">Phí vận chuyển</span>
                <span className="font-body-md text-sm">
                  {calculatingFee
                    ? "Đang tính..."
                    : currentFee === 0
                      ? "Miễn phí"
                      : formatCurrency(currentFee)}
                </span>
              </div>
              {comboDiscount > 0 && (
                <div className="flex justify-between text-primary">
                  <span className="font-body-md text-sm">Combo ({appliedCombo?.comboName})</span>
                  <span className="font-body-md text-sm font-semibold">-{formatCurrency(comboDiscount)}</span>
                </div>
              )}
              {voucherDiscount > 0 && (
                <div className="flex justify-between text-secondary">
                  <span className="font-body-md text-sm">Giảm giá voucher</span>
                  <span className="font-body-md text-sm">-{formatCurrency(voucherDiscount)}</span>
                </div>
              )}
            </div>

            {/* Applied Combo */}
            {appliedCombo && (
              <div className="mb-4 flex items-center justify-between p-3 bg-primary-container rounded-lg">
                <div>
                  <p className="font-body-sm text-body-sm text-on-primary-container font-semibold">
                    🎉 {appliedCombo.comboName}
                  </p>
                  <p className="font-body-xs text-on-primary-container">
                    Đã áp dụng - Tiết kiệm {formatCurrency(appliedCombo.discountAmount)}
                  </p>
                </div>
              </div>
            )}

            {/* Suggested Combos */}
            {!appliedCombo && cart && cart.suggestedCombos.length > 0 && (
              <div className="mb-4 space-y-2">
                {cart.suggestedCombos.map((combo) => (
                  <button
                    key={combo.comboId}
                    onClick={async () => {
                      try {
                        if (!combo.allItemsInCart) {
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
                        const cartData = await cartApi.get();
                        setCart(cartData);
                        if (cartData.appliedCombo) setAppliedCombo(cartData.appliedCombo);
                        toast.showToast("Đã áp dụng combo", "success");
                      } catch (err: unknown) {
                        toast.showToast(err instanceof Error ? err.message : "Lỗi", "error");
                      }
                    }}
                    className="w-full flex items-center justify-between p-3 bg-secondary-container rounded-lg hover:opacity-80 transition"
                  >
                    <div className="text-left">
                      <p className="font-body-sm text-body-sm text-on-secondary-container font-semibold">
                        {combo.allItemsInCart ? "🎉" : `💡 ${combo.matchingCount}/${combo.totalCount} SP`} {combo.comboName}
                      </p>
                      <p className="font-body-xs text-on-secondary-container">Tiết kiệm {formatCurrency(combo.discountAmount)}</p>
                    </div>
                    <span className="material-symbols-outlined text-on-secondary-container">add_circle</span>
                  </button>
                ))}
              </div>
            )}

            <div className="h-px bg-outline-variant/30 w-full mb-6" />

            <div className="flex justify-between items-end mb-8">
              <span className="font-label-caps text-label-caps uppercase">Tổng cộng</span>
              <span className="font-headline-md text-headline-md font-bold">{formatCurrency(total)}</span>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={submitting || !recipientName || !recipientPhone || !shippingAddressDetail}
              className="w-full bg-primary text-on-primary py-5 font-button-text text-button-text uppercase tracking-widest hover:bg-[#2a2a2a] transition-colors duration-500 disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : "Hoàn tất đơn hàng"}
            </button>

            <p className="text-center mt-2 text-on-surface-variant text-[9px] font-body-md leading-relaxed">
              Bằng việc nhấp vào nút trên, bạn đồng ý với <br /> <a className="underline" href="#">Điều khoản dịch vụ</a> của chúng tôi.
            </p>
          </div>
        </aside>
      </div>

      {/* Loading overlay — redirecting to payment gateway */}
      {submitting && paymentMethodId !== 1 && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface p-12 shadow-xl flex flex-col items-center gap-6">
            <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
            <p className="font-body-md text-on-surface-variant">Đang chuyển hướng đến cổng thanh toán...</p>
          </div>
        </div>
      )}

      {/* Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
          <div className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={() => { setShowAddressModal(false); setShowAddAddressForm(false); }} />
          <div className="relative bg-surface border border-surface-dim w-full max-w-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-8 border-b border-outline-variant/30">
              <h2 className="font-headline-md text-headline-md">Địa chỉ đã lưu</h2>
              <button onClick={() => { setShowAddressModal(false); setShowAddAddressForm(false); }} className="hover:text-primary transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-8 overflow-y-auto space-y-6">
              {addresses.length > 0 ? (
                addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <div
                      key={addr.id}
                      className={`p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-colors ${
                        isSelected ? "border border-primary bg-surface-container-lowest" : "border border-outline-variant/30 hover:border-primary"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-body-md font-bold">{addr.fullName}</span>
                          {addr.isDefault && (
                            <span className="bg-primary text-on-primary text-[10px] font-label-caps px-2 py-0.5 uppercase tracking-widest">Mặc định</span>
                          )}
                        </div>
                        <p className="text-on-surface-variant text-sm">{addr.phoneNumber}</p>
                        <p className="text-on-surface-variant text-sm">{addr.street}, {addr.ward}, {addr.district}, {addr.city}</p>
                      </div>
                      <button
                        onClick={() => fillAddress(addr)}
                        className={`px-8 py-3 font-button-text text-button-text uppercase tracking-widest transition-all duration-300 ${
                          isSelected
                            ? "bg-primary text-on-primary"
                            : "border border-primary text-primary hover:bg-primary hover:text-on-primary"
                        }`}
                      >
                        Chọn
                      </button>
                    </div>
                  );
                })
              ) : (
                <p className="text-center py-12 text-on-surface-variant font-body-md">Chưa có địa chỉ nào</p>
              )}
            </div>

            <div className="p-8 border-t border-outline-variant/30 flex justify-end">
              {showAddAddressForm ? (
                <form onSubmit={handleAddAddress} className="w-full space-y-6">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                    <input
                      value={newAddress.contactName}
                      onChange={(e) => setNewAddress({ ...newAddress, contactName: e.target.value })}
                      placeholder="Họ tên"
                      className="col-span-2 bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors border-t-0 border-x-0 px-0"
                    />
                    <input
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                      placeholder="Số điện thoại"
                      className="bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors border-t-0 border-x-0 px-0"
                    />
                    <input
                      value={newAddress.provinceName}
                      onChange={(e) => setNewAddress({ ...newAddress, provinceName: e.target.value })}
                      placeholder="Tỉnh/Thành phố"
                      className="bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors border-t-0 border-x-0 px-0"
                    />
                    <input
                      value={newAddress.districtName}
                      onChange={(e) => setNewAddress({ ...newAddress, districtName: e.target.value })}
                      placeholder="Quận/Huyện"
                      className="bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors border-t-0 border-x-0 px-0"
                    />
                    <input
                      value={newAddress.wardName}
                      onChange={(e) => setNewAddress({ ...newAddress, wardName: e.target.value })}
                      placeholder="Phường/Xã"
                      className="bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors border-t-0 border-x-0 px-0"
                    />
                    <input
                      value={newAddress.detailAddress}
                      onChange={(e) => setNewAddress({ ...newAddress, detailAddress: e.target.value })}
                      placeholder="Địa chỉ chi tiết"
                      className="col-span-2 bg-transparent border-b border-outline-variant py-2 font-body-md placeholder:text-outline focus:border-primary transition-colors border-t-0 border-x-0 px-0"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="isDefault" checked={newAddress.isDefault} onChange={(e) => setNewAddress({ ...newAddress, isDefault: e.target.checked })} className="accent-primary" />
                    <label htmlFor="isDefault" className="font-body-md text-body-sm text-on-surface-variant">Đặt làm địa chỉ mặc định</label>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={addingAddress} className="bg-primary text-on-primary px-8 py-3 font-button-text text-button-text uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-50">
                      {addingAddress ? "Đang thêm..." : "Thêm"}
                    </button>
                    <button type="button" onClick={() => setShowAddAddressForm(false)} className="border border-outline-variant px-8 py-3 font-button-text text-button-text uppercase tracking-widest hover:bg-surface-container-low transition-colors">
                      Hủy
                    </button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setShowAddAddressForm(true)} className="font-label-caps text-label-caps underline hover:text-primary transition-colors uppercase tracking-widest">
                  Thêm địa chỉ mới
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop pt-10 pb-section-padding animate-pulse"><div className="h-8 bg-surface-container-low rounded w-1/4 mb-8" /></div>}>
      <CheckoutContent />
    </Suspense>
  );
}
