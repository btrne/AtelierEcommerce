"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { profile as profileApi, orders as ordersApi, wishlist as wishlistApi, cart as cartApi, auth, locations as locationsApi, customRequestsApi, reviews as reviewsApi } from "@/lib/api";
import type { UserProfile, OrderCustomerDto, WishlistItemDto, AddressDto, OrderDetailDto, CustomRequestDto } from "@/lib/types";
import { formatCurrency, getStatusLabel, getStatusColor, getShipmentStatusLabel } from "@/utils/format";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/ConfirmDialog";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("customer_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

interface Province { code: string; name: string; }
interface District { code: string; name: string; }
interface Ward { code: string; name: string; }

type Tab = "info" | "wishlist" | "orders" | "bespoke";

export default function AccountPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderCustomerDto[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItemDto[]>([]);
  const [bespokeRequests, setBespokeRequests] = useState<CustomRequestDto[]>([]);
  const [bespokeDetail, setBespokeDetail] = useState<CustomRequestDto | null>(null);
  const [bespokeLoading, setBespokeLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<Record<number, OrderDetailDto>>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "info" || tab === "wishlist" || tab === "orders" || tab === "bespoke") {
      setActiveTab(tab);
    }
  }, []);

  // Address modal
  const [addressModal, setAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<AddressDto | null>(null);
  const [addressForm, setAddressForm] = useState({ fullName: "", phoneNumber: "", street: "", ward: "", district: "", city: "", isDefault: false });
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);

  // Province/Ward API
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>(null);

  // Profile edit modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: "", phoneNumber: "", email: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const loadData = useCallback(async () => {
    if (!auth.isLoggedIn()) { router.push("/login"); return; }
    try {
      const [provincesData, profileData, ordersData, wishlistData] = await Promise.all([
        locationsApi.provinces(),
        profileApi.get(),
        ordersApi.list({ page: 1, pageSize: 10 }),
        wishlistApi.get(),
      ]);
      setProvinces(provincesData);
      setProfile(profileData);
      setOrders(ordersData.items);
      const initialReviewed = new Set<number>();
      for (const o of ordersData.items) {
        for (const item of o.items) {
          if (item.hasReviewed && item.id) initialReviewed.add(item.id);
        }
      }
      setRatedItems(initialReviewed);
      setWishlist(wishlistData);
      try { setBespokeRequests(await customRequestsApi.my()); } catch {}
    } catch { }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { loadData(); }, [loadData]);

  // ---- Profile Edit ----
  const openEditProfile = () => {
    setProfileForm({ fullName: profile?.fullName || "", phoneNumber: profile?.phoneNumber || "", email: profile?.email || "" });
    setShowProfileModal(true);
  };

  const saveProfile = async () => {
    if (!profileForm.fullName.trim()) return;
    const phone = profileForm.phoneNumber.trim();
    if (phone && !/^\d{10}$/.test(phone)) { showToast("Số điện thoại phải gồm 10 chữ số"); return; }
    setSavingProfile(true);
    try {
      await profileApi.update(profileForm);
      const updated = await profileApi.get();
      setProfile(updated);
      setShowProfileModal(false);
      showToast("Cập nhật hồ sơ thành công", "success");
    } catch {
      showToast("Cập nhật hồ sơ thất bại", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // ---- Wishlist ----
  const handleRemoveWishlist = async (id: number) => {
    try {
      await wishlistApi.remove(id);
      setWishlist((prev) => prev.filter((item) => item.id !== id));
    } catch { }
  };

  const handleAddToCartFromWishlist = async (item: WishlistItemDto) => {
    try {
      await cartApi.add({ productVariantId: item.productId, quantity: 1 });
      showToast("Đã thêm vào giỏ hàng");
    } catch {
      showToast("Thêm vào giỏ hàng thất bại", "error");
    }
  };

  // ---- Reviews ----
  const [reviewModal, setReviewModal] = useState<{ orderItemId: number; productName: string } | null>(null);
  const [reviewForm, setReviewForm] = useState({ stars: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [ratedItems, setRatedItems] = useState<Set<number>>(new Set());

  const handleOpenReview = (orderItemId: number, productName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReviewModal({ orderItemId, productName });
    setReviewForm({ stars: 5, comment: "" });
  };

  const handleSubmitReview = async () => {
    if (!reviewModal) return;
    setSubmittingReview(true);
    try {
      await reviewsApi.create({ orderItemId: reviewModal.orderItemId, stars: reviewForm.stars, comment: reviewForm.comment });
      showToast("Đã gửi đánh giá thành công", "success");
      setRatedItems((prev) => new Set(prev).add(reviewModal.orderItemId));
      setReviewModal(null);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Gửi đánh giá thất bại", "error");
    } finally {
      setSubmittingReview(false);
    }
  };

  // ---- Orders ----
  const handleCancelOrder = async (orderId: number) => {
    const ok = await confirm("Bạn có chắc chắn muốn hủy đơn hàng này?");
    if (!ok) return;
    try {
      await ordersApi.cancel(orderId);
      showToast("Đã hủy đơn hàng");
      loadData();
    } catch {
      showToast("Hủy đơn hàng thất bại", "error");
    }
  };

  const canCancel = (status: string) => status.toLowerCase() === "pending";

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      Pending: "Chờ duyệt", Quoted: "Đã báo giá", Confirmed: "Đã xác nhận",
      Rejected: "Đã từ chối", InProgress: "Đang thực hiện", Completed: "Hoàn thành",
    };
    return map[s] || s;
  };

  const toggleOrder = async (id: number) => {
    const expanding = expandedOrder !== id;
    setExpandedOrder(expanding ? id : null);
    if (expanding && !orderDetails[id]) {
      try {
        const detail = await ordersApi.getDetail(id);
        setOrderDetails((prev) => ({ ...prev, [id]: detail }));
      } catch { }
    }
  };

  // ---- Province/Ward helpers ----
  async function loadDistricts(provinceCode: string) {
    if (!provinceCode) { setDistricts([]); setSelectedDistrict(null); setWards([]); setSelectedWard(null); return; }
    try {
      const data = await locationsApi.districts(provinceCode);
      setDistricts(data);
    } catch { setDistricts([]); }
    setSelectedDistrict(null);
    setWards([]);
    setSelectedWard(null);
  }

  async function loadWards(districtCode: string) {
    if (!districtCode) { setWards([]); setSelectedWard(null); return; }
    try {
      const data = await locationsApi.wards(districtCode);
      setWards(data);
    } catch { setWards([]); }
    setSelectedWard(null);
  }

  // Resolve province/district/ward codes from names when editing
  useEffect(() => {
    if (!addressModal || !editingAddress || provinces.length === 0) return;
    resolveAddressCodes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressModal, editingAddress, provinces]);

  async function resolveAddressCodes() {
    if (!editingAddress) return;
    setResolving(true);
    try {
      const addr = editingAddress;
      const province = provinces.find(p => p.name === addr.city);
      if (province) {
        setSelectedProvince(province.code);
        const districtList = await locationsApi.districts(province.code);
        setDistricts(districtList);
        const district = districtList.find(d => d.name === addr.district);
        if (district) {
          setSelectedDistrict(district.code);
          const wardList = await locationsApi.wards(district.code);
          setWards(wardList);
          const ward = wardList.find(w => w.name === addr.ward);
          if (ward) setSelectedWard(ward.code);
        }
      }
    } finally {
      setResolving(false);
    }
  }

  // ---- Address CRUD ----
  const openAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({ fullName: profile?.fullName || "", phoneNumber: profile?.phoneNumber || "", street: "", ward: "", district: "", city: "", isDefault: false });
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setAddressModal(true);
  };

  const openEditAddress = (addr: AddressDto) => {
    setEditingAddress(addr);
    setAddressForm({
      fullName: addr.fullName || profile?.fullName || "",
      phoneNumber: addr.phoneNumber || profile?.phoneNumber || "",
      street: addr.street,
      ward: addr.ward,
      district: addr.district,
      city: addr.city,
      isDefault: addr.isDefault,
    });
    setSelectedProvince(null);
    setSelectedDistrict(null);
    setSelectedWard(null);
    setDistricts([]);
    setWards([]);
    setAddressModal(true);
  };

  const saveAddress = async () => {
    if (!addressForm.street.trim() || !addressForm.fullName.trim()) return;
    const phone = addressForm.phoneNumber.trim();
    if (phone && !/^\d{10}$/.test(phone)) { showToast("Số điện thoại phải gồm 10 chữ số"); return; }
    setSaving(true);
    try {
      const body = {
        contactName: addressForm.fullName,
        phone: phone || null,
        detailAddress: addressForm.street,
        wardName: addressForm.ward || null,
        districtName: addressForm.district || null,
        provinceName: addressForm.city || null,
        isDefault: addressForm.isDefault,
      };
      if (editingAddress) {
        await fetch(`${API_BASE}/users/address/${editingAddress.id}`, { method: "PUT", headers: getAuthHeaders(), body: JSON.stringify(body) });
      } else {
        await fetch(`${API_BASE}/users/address`, { method: "POST", headers: getAuthHeaders(), body: JSON.stringify(body) });
      }
      const updated = await profileApi.get();
      setProfile(updated);
      setAddressModal(false);
      showToast(editingAddress ? "Cập nhật địa chỉ thành công" : "Thêm địa chỉ thành công", "success");
    } catch {
      showToast(editingAddress ? "Cập nhật địa chỉ thất bại" : "Thêm địa chỉ thất bại", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    const ok = await confirm("Bạn có chắc chắn muốn xóa địa chỉ này?");
    if (!ok) return;
    try {
      await profileApi.addresses.delete(id);
      const updated = await profileApi.get();
      setProfile(updated);
      showToast("Xóa địa chỉ thành công", "success");
    } catch {
      showToast("Xóa địa chỉ thất bại", "error");
    }
  };

  if (loading) {
    return (
    <div className="w-full max-w-[1440px] mx-auto px-5 md:px-16 py-10">
      <div className="h-8 bg-surface-container-low w-80 mb-4" />
        <div className="h-4 bg-surface-container-low w-96 mb-12" />
        <div className="h-12 bg-surface-container-low w-full mb-12" />
        <div className="grid grid-cols-2 gap-12">{[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-surface-container-low" />)}</div>
      </div>
    );
  }

  const profileName = profile?.fullName || auth.getProfile()?.fullName || "";

  const tabs: { key: Tab; label: string }[] = [
    { key: "info", label: "Thông tin cá nhân" },
    { key: "wishlist", label: "Yêu thích" },
    { key: "orders", label: "Đơn hàng" },
    { key: "bespoke", label: "Chế tác" },
  ];

  return (
    <div className="w-full max-w-[1440px] mx-auto px-5 md:px-16 py-10 flex flex-col gap-10">
      {/* Welcome */}
      <section className="flex flex-col gap-2">
        <h1 className="font-headline-lg text-[32px] md:text-[56px] leading-tight font-medium">
          Welcome back, {profileName}
        </h1>
        <p className="font-body-lg font-light text-on-surface-variant">
          Quản lý trải nghiệm Atelier của bạn, từ các món đồ mới sở hữu đến chi tiết giao hàng.
        </p>
      </section>

      {/* Tab Nav */}
      <nav className="flex gap-6 border-b border-secondary/20 pb-4 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-label-caps whitespace-nowrap pb-2 transition-colors ${
              activeTab === tab.key
                ? "text-primary border-b-2 border-secondary"
                : "text-on-surface-variant hover:text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Tab: Info */}
      {activeTab === "info" && profile && (
          <div className="flex flex-col gap-16">
          {/* Profile */}
          <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-baseline gap-4 mb-8">
              <h2 className="font-headline text-2xl md:text-[36px] font-normal">Hồ sơ cá nhân</h2>
              <button onClick={openEditProfile} className="font-label-caps border-b border-on-surface pb-1 hover:text-secondary hover:border-secondary transition-colors">
                Chỉnh sửa hồ sơ
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-16">
              {[
                { label: "Họ và tên", value: profile.fullName },
                { label: "Tổng đơn hàng", value: `${profile.orderCount} đơn` },
                { label: "Email", value: profile.email },
                { label: "Tổng chi tiêu", value: formatCurrency(profile.totalSpent) },
                { label: "Số điện thoại", value: profile.phoneNumber || "—" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col gap-2">
                  <span className="font-label-caps text-secondary">{item.label}</span>
                  <span className="font-body text-lg md:text-xl">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Addresses */}
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-baseline justify-between gap-4 border-b border-secondary/20 pb-6">
              <h2 className="font-headline text-2xl md:text-[36px] font-normal">Danh sách địa chỉ</h2>
              <button onClick={openAddAddress} className="bg-primary text-on-primary px-6 py-3 font-label-caps hover:bg-secondary transition-colors duration-500">
                Thêm địa chỉ mới
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {profile.addresses.length === 0 ? (
                <p className="font-body text-on-surface-variant col-span-full">Chưa có địa chỉ nào.</p>
              ) : (
                profile.addresses.map((addr) => (
                  <div key={addr.id} className="border border-secondary/30 p-6 flex flex-col gap-4 relative">
                    {addr.isDefault && (
                      <div className="absolute top-6 right-6">
                        <span className="font-label-caps text-[9px] bg-[#f2ede9] px-2 py-1">Mặc định</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <h3 className="font-headline text-xl md:text-2xl font-normal">{addr.fullName}</h3>
                      <p className="font-body font-light text-sm text-on-surface-variant">{addr.phoneNumber}</p>
                    </div>
                    <p className="font-body font-light text-sm leading-loose text-on-surface-variant">
                      {addr.street}
                      {addr.ward && <>, {addr.ward}</>}
                      {addr.district && <><br />{addr.district}</>}
                      {addr.city && <><br />{addr.city}</>}
                    </p>
                    <div className="flex gap-6 mt-2">
                      <button onClick={() => openEditAddress(addr)} className="font-label-caps text-[10px] border-b border-on-surface pb-0.5 hover:text-secondary hover:border-secondary">Chỉnh sửa</button>
                      <button onClick={() => handleDeleteAddress(addr.id)} className="font-label-caps text-[10px] text-on-surface-variant hover:text-primary">Xóa</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Wishlist */}
      {activeTab === "wishlist" && (
        <section className="flex flex-col gap-6">
          <div className="border-b border-secondary/20 pb-4">
            <h2 className="font-headline text-2xl md:text-[36px] font-normal">Danh sách yêu thích</h2>
          </div>
          {wishlist.length === 0 ? (
            <div className="text-center py-12 px-12 md:px-24 border border-secondary/20 w-11/12 mx-auto">
              <span className="material-symbols-outlined text-5xl text-outline mb-4 block">favorite</span>
              <p className="font-body text-on-surface-variant mb-4">Chưa có sản phẩm yêu thích</p>
              <Link href="/products" className="font-label-caps border-b border-on-surface pb-1 hover:text-secondary transition-colors">
                Khám phá ngay
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {wishlist.map((item) => (
                <div key={item.id} className="relative flex flex-col gap-4 md:gap-6 group">
                  <button
                    onClick={() => handleRemoveWishlist(item.id)}
                    className="absolute top-2 right-2 z-10 w-7 h-7 flex items-center justify-center bg-white/80 hover:bg-white text-on-surface-variant hover:text-error rounded-full transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                  <Link href={`/products/${item.productId}`}>
                    <div className="aspect-[3/4] bg-[#f2ede9] overflow-hidden">
                      <img
                        src={item.productImage || "/placeholder.svg"}
                        alt={item.productName}
                        className="w-full h-full object-cover transition-opacity duration-700 group-hover:opacity-80"
                      />
                    </div>
                    <div className="flex flex-col gap-1 mt-3 md:mt-4">
                      <h3 className="font-label-caps text-[10px] md:text-[11px] leading-relaxed">{item.productName}</h3>
                      <p className="font-body text-xs md:text-sm font-light text-on-surface-variant">{formatCurrency(item.basePrice)}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => handleAddToCartFromWishlist(item)}
                    className="w-full border border-secondary/30 py-2 font-label-caps text-[10px] hover:bg-primary hover:text-on-primary hover:border-primary transition-colors"
                  >
                    Thêm vào giỏ hàng
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tab: Orders */}
      {activeTab === "orders" && (
        <section className="flex flex-col gap-6">
          <div className="border-b border-secondary/20 pb-4">
            <h2 className="font-headline text-2xl md:text-[36px] font-normal">Lịch sử đơn hàng</h2>
          </div>
          {orders.length === 0 ? (
            <div className="text-center py-16 border border-secondary/20 mx-auto max-w-md">
              <span className="material-symbols-outlined text-5xl text-outline mb-4 block">receipt_long</span>
              <p className="font-body text-on-surface-variant mb-4">Chưa có đơn hàng nào</p>
              <Link href="/products" className="font-label-caps border-b border-on-surface pb-1 hover:text-secondary transition-colors">
                Mua sắm ngay
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Desktop column headers */}
              <div className="grid grid-cols-12 gap-4 pb-4 border-b border-outline-variant hidden md:grid">
                <div className="col-span-2 font-label-caps text-[10px] text-on-surface-variant text-center">MÃ ĐƠN HÀNG</div>
                <div className="col-span-2 font-label-caps text-[10px] text-on-surface-variant text-center">NGÀY ĐẶT</div>
                <div className="col-span-4 font-label-caps text-[10px] text-on-surface-variant">SẢN PHẨM</div>
                <div className="col-span-2 font-label-caps text-[10px] text-on-surface-variant text-center">TRẠNG THÁI</div>
                <div className="col-span-1 font-label-caps text-[10px] text-on-surface-variant text-center whitespace-nowrap">TỔNG CỘNG</div>
                <div className="col-span-1"></div>
              </div>

              {orders.map((order) => (
                <div key={order.id} className="border border-outline-variant">
                  {/* Order row */}
                  <div
                    className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center p-5 md:p-6 cursor-pointer hover:bg-surface-container-low transition-colors"
                    onClick={() => toggleOrder(order.id)}
                  >
                    {/* Order Code */}
                    <div className="md:col-span-2">
                      <span className="md:hidden font-label-caps text-[10px] text-on-surface-variant block mb-1">MÃ ĐƠN HÀNG</span>
                      <span className="font-body-md font-semibold">#{order.orderCode}</span>
                    </div>

                    {/* Date */}
                    <div className="md:col-span-2 text-center">
                      <span className="md:hidden font-label-caps text-[10px] text-on-surface-variant block mb-1">NGÀY ĐẶT</span>
                      <span className="font-body-md text-on-surface-variant">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>

                    {/* Products - first item + count */}
                    <div className="md:col-span-4 flex items-center gap-4">
                      {order.items.length > 0 && (
                        <>
                          <div className="w-14 h-[56px] md:w-16 md:h-20 bg-surface-container overflow-hidden shrink-0">
                            <img
                              src={order.items[0].productImage || "/placeholder.svg"}
                              alt={order.items[0].productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="md:hidden font-label-caps text-[10px] text-on-surface-variant block mb-1">SẢN PHẨM</span>
                            <span className="font-body-md text-sm leading-tight block truncate">{order.items[0].productName}</span>
                            {order.items.length > 1 && (
                              <span className="text-[11px] text-on-surface-variant italic">+ {order.items.length - 1} sản phẩm khác</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2 text-center">
                      <span className="md:hidden font-label-caps text-[10px] text-on-surface-variant block mb-1">TRẠNG THÁI</span>
                      <span className={"inline-flex items-center gap-2 px-2 py-1 font-label-caps text-[10px] tracking-widest " + getStatusColor(order.status)}>
                        <span className={`w-1.5 h-1.5 rounded-full bg-current ${order.status === "shipped" || order.status === "pending" ? "animate-pulse" : ""}`} />
                        {getStatusLabel(order.status)}
                      </span>
                    </div>

                    {/* Total */}
                    <div className="md:col-span-1">
                      <span className="md:hidden font-label-caps text-[10px] text-on-surface-variant block mb-1">TỔNG CỘNG</span>
                      <span className="font-body-md font-semibold">{formatCurrency(order.totalAmount)}</span>
                    </div>

                    {/* Chevron */}
                    <div className="md:col-span-1 text-right">
                      <span className={`material-symbols-outlined text-base transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`}>
                        expand_more
                      </span>
                    </div>
                  </div>

                  {/* Expanded items */}
                  {expandedOrder === order.id && (
                    <div className="border-t border-outline-variant px-5 md:px-6 py-4 space-y-3">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex gap-4 items-start">
                          <div className="w-14 h-[56px] bg-surface-container shrink-0 overflow-hidden">
                            <img
                              src={item.productImage || "/placeholder.svg"}
                              alt={item.productName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-label-caps text-[10px] leading-relaxed">{item.productName}</h4>
                            {item.variantInfo && (
                              <p className="font-body text-[10px] text-on-surface-variant mt-0.5">{item.variantInfo}</p>
                            )}
                            <div className="flex justify-between items-center mt-1">
                              <span className="font-body text-xs text-on-surface-variant">x{item.quantity}</span>
                              <span className="font-body text-xs font-semibold">{formatCurrency(item.unitPrice)}</span>
                            </div>
                            {order.status === "Completed" && item.id && !ratedItems.has(item.id) && (
                              <button
                                onClick={(e) => handleOpenReview(item.id!, item.productName, e)}
                                className="mt-2 font-label-caps text-[9px] text-primary border border-primary/30 px-3 py-1 hover:bg-primary/5 transition-colors"
                              >
                                Đánh giá
                              </button>
                            )}
                            {order.status === "Completed" && item.id && ratedItems.has(item.id) && (
                              <span className="mt-2 inline-block font-label-caps text-[9px] text-on-surface-variant px-3 py-1 border border-outline-variant">
                                Đã đánh giá
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Timeline */}
                      {orderDetails[order.id] && (orderDetails[order.id].orderLogs.length > 0 || orderDetails[order.id].shipments.length > 0) && (
                        <div className="pt-4 border-t border-outline-variant">
                          <p className="font-label-caps text-[10px] text-on-surface-variant mb-3">LỊCH SỬ ĐƠN HÀNG</p>
                          <div className="space-y-0">
                            {(() => {
                              const logs = orderDetails[order.id].orderLogs;
                              const allEntries: { date: string; label: string; note?: string | null }[] = [];
                              for (const log of logs) {
                                allEntries.push({ date: log.createdAt, label: getStatusLabel(log.toStatus) || log.toStatus, note: log.note });
                              }
                              for (const s of orderDetails[order.id].shipments) {
                                for (const t of s.trackingLogs) {
                                  allEntries.push({ date: t.createdAt, label: getShipmentStatusLabel(t.status), note: t.description });
                                }
                              }
                              allEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                              return allEntries.map((entry, idx) => (
                                <div key={idx} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-2.5 h-2.5 rounded-full mt-1 ${idx === 0 ? "bg-secondary" : "bg-outline-variant"}`} />
                                    {idx < allEntries.length - 1 && <div className="w-px flex-1 bg-outline-variant/50 min-h-[20px]" />}
                                  </div>
                                  <div className="pb-3 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-label-caps text-[10px]">{entry.label}</span>
                                      {entry.note && <span className="text-[9px] text-on-surface-variant">· {entry.note}</span>}
                                    </div>
                                    <p className="text-[9px] text-on-surface-variant">{new Date(entry.date).toLocaleString("vi-VN")}</p>
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Cancel button */}
                      {canCancel(order.status) && (
                        <div className="pt-3 border-t border-outline-variant flex justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleCancelOrder(order.id); }}
                            className="font-label-caps text-[10px] text-error border border-error/30 px-4 py-2 hover:bg-error/5 transition-colors"
                          >
                            Hủy đơn hàng
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => !submittingReview && setReviewModal(null)}>
          <div className="bg-background w-full max-w-lg mx-4 p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-2xl mb-6">Đánh giá sản phẩm</h3>
            <p className="font-body text-sm text-on-surface-variant mb-6">{reviewModal.productName}</p>
            <div className="flex flex-col gap-4">
              {/* Star rating */}
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, stars: star })}
                    className="hover:opacity-60 transition-opacity"
                  >
                    <span
                      className="material-symbols-outlined text-2xl"
                      style={{ fontVariationSettings: star <= reviewForm.stars ? "'FILL' 1, 'wght' 400" : "'FILL' 0, 'wght' 300" }}
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
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary min-h-[100px] resize-none"
              />
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => setReviewModal(null)}
                disabled={submittingReview}
                className="flex-1 border border-secondary/30 px-6 py-3 font-label-caps hover:bg-surface-container-low transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReview}
                disabled={submittingReview}
                className="flex-1 bg-primary text-on-primary px-6 py-3 font-label-caps hover:bg-secondary transition-colors disabled:opacity-40"
              >
                {submittingReview ? "Đang gửi..." : "Gửi đánh giá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Bespoke */}
      {activeTab === "bespoke" && (
        <section className="flex flex-col gap-6">
          <div className="border-b border-secondary/20 pb-4">
            <h2 className="font-headline text-2xl md:text-[36px] font-normal">Chế tác riêng</h2>
          </div>
          {!bespokeDetail ? (
            <>
              {bespokeRequests.length === 0 ? (
                <div className="text-center py-12 px-12 md:px-24 border border-secondary/20 w-11/12 mx-auto">
                  <span className="material-symbols-outlined text-5xl text-outline mb-4 block">handyman</span>
                  <p className="font-body text-on-surface-variant mb-4">Chưa có yêu cầu chế tác nào.</p>
                  <p className="font-body text-sm text-on-surface-variant">Liên hệ với admin qua mục hỗ trợ để tạo yêu cầu chế tác riêng.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {bespokeRequests.map((r) => {
                    const statusColors: Record<string, string> = {
                      Pending: "text-orange-600 border-orange-500",
                      Quoted: "text-blue-600 border-blue-500",
                      Confirmed: "text-green-600 border-green-500",
                      Rejected: "text-red-600 border-red-500",
                      InProgress: "text-purple-600 border-purple-500",
                      Completed: "text-green-600 border-green-500",
                    };
                    const statusLabels: Record<string, string> = {
                      Pending: "Chờ duyệt", Quoted: "Đã báo giá", Confirmed: "Đã xác nhận",
                      Rejected: "Đã từ chối", InProgress: "Đang thực hiện", Completed: "Hoàn thành",
                    };
                    return (
                      <button
                        key={r.id}
                        onClick={() => setBespokeDetail(r)}
                        className="text-left border border-secondary/20 p-6 hover:bg-surface-container-low transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-headline text-lg">Yêu cầu #{r.id}</span>
                          <span className={`font-label-caps text-[10px] px-2 py-0.5 border ${statusColors[r.status] || "border-secondary/30"}`}>
                            {statusLabels[r.status] || r.status}
                          </span>
                        </div>
                        {r.description && (
                          <p className="font-body text-sm text-on-surface-variant line-clamp-2 mb-2">{r.description}</p>
                        )}
                        {r.imageUrl && (
                          <div className="w-full h-32 bg-surface-container overflow-hidden mb-2">
                            <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        {r.quotedPrice != null && (
                          <p className="font-body text-sm font-semibold">{r.quotedPrice.toLocaleString()}₫</p>
                        )}
                        <p className="font-body text-[10px] text-on-surface-variant mt-2">
                          {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col gap-6">
              <button
                onClick={() => setBespokeDetail(null)}
                className="flex items-center gap-2 font-label-caps text-sm text-on-surface-variant hover:text-secondary transition-colors self-start"
              >
                <span className="material-symbols-outlined text-base">arrow_back</span>
                Quay lại
              </button>
              <div className="border border-secondary/20 p-6 md:p-8 max-w-2xl">
                {bespokeDetail.imageUrl && (
                  <div className="w-full h-64 bg-surface-container overflow-hidden mb-6">
                    <img src={bespokeDetail.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <h3 className="font-headline text-xl md:text-2xl mb-6">Yêu cầu #{bespokeDetail.id}</h3>

                <div className="flex flex-col gap-4">
                  {bespokeDetail.description && (
                    <div>
                      <p className="font-label-caps text-[10px] text-on-surface-variant mb-1">Mô tả:</p>
                      <p className="font-body">{bespokeDetail.description}</p>
                    </div>
                  )}

                  <div className="flex justify-between border-b border-secondary/20 pb-3">
                    <span className="font-body text-sm text-on-surface-variant">Trạng thái</span>
                    <span className={`font-body text-sm font-semibold ${
                      bespokeDetail.status === "Confirmed" || bespokeDetail.status === "Completed" ? "text-green-600" :
                      bespokeDetail.status === "Quoted" ? "text-blue-600" :
                      bespokeDetail.status === "Rejected" ? "text-red-600" : "text-orange-600"
                    }`}>
                      {statusLabel(bespokeDetail.status)}
                    </span>
                  </div>

                  {bespokeDetail.quotedPrice != null && (
                    <div className="flex justify-between border-b border-secondary/20 pb-3">
                      <span className="font-body text-sm text-on-surface-variant">Báo giá</span>
                      <span className="font-body text-sm font-semibold">{bespokeDetail.quotedPrice.toLocaleString()}₫</span>
                    </div>
                  )}

                  {bespokeDetail.estimatedFinishDate && (
                    <div className="flex justify-between border-b border-secondary/20 pb-3">
                      <span className="font-body text-sm text-on-surface-variant">Dự kiến hoàn thành</span>
                      <span className="font-body text-sm">{new Date(bespokeDetail.estimatedFinishDate).toLocaleDateString("vi-VN")}</span>
                    </div>
                  )}

                  {bespokeDetail.customerConfirmedAt && (
                    <div className="flex justify-between border-b border-secondary/20 pb-3">
                      <span className="font-body text-sm text-on-surface-variant">Đã xác nhận lúc</span>
                      <span className="font-body text-sm">{new Date(bespokeDetail.customerConfirmedAt).toLocaleString("vi-VN")}</span>
                    </div>
                  )}
                </div>

                {bespokeDetail.status === "Quoted" && (
                  <div className="flex gap-4 mt-8">
                    <button
                      onClick={async () => {
                        try {
                          await customRequestsApi.reject(bespokeDetail.id);
                          setBespokeDetail({ ...bespokeDetail, status: "Rejected" });
                          setBespokeRequests((prev) => prev.map((r) => r.id === bespokeDetail.id ? { ...r, status: "Rejected" } : r));
                          showToast("Đã từ chối yêu cầu chế tác");
                        } catch { showToast("Thao tác thất bại", "error"); }
                      }}
                      className="flex-1 border border-secondary/30 px-6 py-3 font-label-caps hover:bg-surface-container-low transition-colors"
                    >
                      Từ chối
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await customRequestsApi.confirm(bespokeDetail.id);
                          showToast("Đã xác nhận, chuyển đến thanh toán...");
                          router.push(`/checkout?customRequestId=${bespokeDetail.id}`);
                        } catch { showToast("Thao tác thất bại", "error"); }
                      }}
                      className="flex-1 bg-primary text-on-primary px-6 py-3 font-label-caps hover:bg-secondary transition-colors"
                    >
                      Xác nhận và thanh toán
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Address Modal */}
      {addressModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => !saving && setAddressModal(false)}>
          <div className="bg-background w-full max-w-lg mx-4 p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-2xl mb-6">{editingAddress ? "Chỉnh sửa địa chỉ" : "Thêm địa chỉ mới"}</h3>
            <div className="flex flex-col gap-4">
              <input placeholder="Họ và tên *" value={addressForm.fullName} onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary" />
              <input placeholder="Số điện thoại (10 số)" value={addressForm.phoneNumber} onChange={(e) => setAddressForm({ ...addressForm, phoneNumber: e.target.value })}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary" />
              <input placeholder="Địa chỉ (số nhà, đường) *" value={addressForm.street} onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary" />

              {/* Province/District/Ward Selects */}
              <select
                value={selectedProvince ?? ""}
                  onChange={async (e) => {
                    const code = e.target.value || null;
                    setSelectedProvince(code);
                    setSelectedDistrict(null);
                    setSelectedWard(null);
                    setDistricts([]);
                    setWards([]);
                    setAddressForm(prev => ({ ...prev, city: code ? e.target.options[e.target.selectedIndex].text : "", district: "", ward: "" }));
                    if (code) await loadDistricts(code);
                  }}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary"
              >
                <option value="">Tỉnh/Thành phố *</option>
                {provinces.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>

              <select
                value={selectedDistrict ?? ""}
                onChange={async (e) => {
                  const code = e.target.value || null;
                  setSelectedDistrict(code);
                  setSelectedWard(null);
                  setWards([]);
                  setAddressForm(prev => ({ ...prev, district: code ? e.target.options[e.target.selectedIndex].text : "", ward: "" }));
                  if (code) await loadWards(code);
                }}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary"
                disabled={!selectedProvince}
              >
                <option value="">Quận/Huyện</option>
                {districts.map(d => <option key={d.code} value={d.code}>{d.name}</option>)}
              </select>

              <select
                value={selectedWard ?? ""}
                onChange={(e) => {
                  const code = e.target.value || null;
                  setSelectedWard(code);
                  setAddressForm(prev => ({ ...prev, ward: code ? e.target.options[e.target.selectedIndex].text : "" }));
                }}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary"
                disabled={!selectedDistrict}
              >
                <option value="">Phường/Xã</option>
                {wards.map(w => <option key={w.code} value={w.code}>{w.name}</option>)}
              </select>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={addressForm.isDefault} onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="w-4 h-4 accent-secondary" />
                <span className="font-body text-sm">Đặt làm địa chỉ mặc định</span>
              </label>
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setAddressModal(false)} disabled={saving}
                className="flex-1 border border-secondary/30 px-6 py-3 font-label-caps hover:bg-surface-container-low transition-colors">
                Hủy
              </button>
              <button onClick={saveAddress} disabled={saving || !addressForm.fullName.trim() || !addressForm.street.trim()}
                className="flex-1 bg-primary text-on-primary px-6 py-3 font-label-caps hover:bg-secondary transition-colors disabled:opacity-40">
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40" onClick={() => !savingProfile && setShowProfileModal(false)}>
          <div className="bg-background w-full max-w-lg mx-4 p-8 md:p-12" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-headline text-2xl mb-6">Chỉnh sửa hồ sơ</h3>
            <div className="flex flex-col gap-4">
              <input placeholder="Họ và tên *" value={profileForm.fullName} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary" />
              <input placeholder="Số điện thoại (10 số)" value={profileForm.phoneNumber} onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary" />
              <input placeholder="Email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full border border-secondary/30 px-4 py-3 font-body text-sm bg-transparent focus:outline-none focus:border-secondary" />
            </div>
            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowProfileModal(false)} disabled={savingProfile}
                className="flex-1 border border-secondary/30 px-6 py-3 font-label-caps hover:bg-surface-container-low transition-colors">
                Hủy
              </button>
              <button onClick={saveProfile} disabled={savingProfile || !profileForm.fullName.trim()}
                className="flex-1 bg-primary text-on-primary px-6 py-3 font-label-caps hover:bg-secondary transition-colors disabled:opacity-40">
                {savingProfile ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}