import type { LoginRequest, RegisterRequest, LoginResponse, UserProfile, AddressDto, AddressRequest, ProductCustomerDto, ProductDetailCustomerDto, CartDto, AddToCartRequest, OrderCustomerDto, CreateOrderRequest, CheckoutResult, WishlistItemDto, CollectionDto, CategoryDto, VoucherDto, ActiveVoucherDto, ApplyVoucherRequest, ApplyVoucherResponse, ShippingFeeOptionsResult, PaymentDto, PaginatedList, ReviewDto, CreateReviewRequest, AttributeDto, CollectionRecommendationDto, OrderDetailDto, ConversationDto, MessageDto, AiChatRequest, AiChatResponse, CustomRequestDto, ProductComboCustomerDto, CartComboCheckResult } from "./types";
import { track } from "./tracking";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("customer_token");
}

export function setToken(token: string): void {
  localStorage.setItem("customer_token", token);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth-changed"));
  }
}

export function removeToken(): void {
  localStorage.removeItem("customer_token");
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

interface UserProfileStore {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
}

export function storeUserProfile(profile: LoginResponse): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("customer_profile", JSON.stringify({
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    roles: profile.roles,
  }));
}

export function getUserProfile(): UserProfileStore | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("customer_profile");
  return raw ? JSON.parse(raw) : null;
}

export function removeUserProfile(): void {
  localStorage.removeItem("customer_profile");
}

const SESSION_ID_KEY = "session_id";

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export function getSessionId(): string | null {
  return localStorage.getItem(SESSION_ID_KEY);
}

export function clearSessionId(): void {
  localStorage.removeItem(SESSION_ID_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (res.status === 401) {
    removeToken();
    removeUserProfile();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.text();
    let message = body || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      message = parsed.Error || parsed.error || parsed.message || message;
    } catch { }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function buildParams(params: Record<string, string | number | boolean | undefined>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== "") sp.append(k, String(v));
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const auth = {
  login: (data: LoginRequest) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((res) => {
      setToken(res.token);
      storeUserProfile(res);
      return res;
    }),
  register: (data: RegisterRequest) =>
    request<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }).then((res) => {
      setToken(res.token);
      storeUserProfile(res);
      return res;
    }),
  logout: () => {
    removeToken();
    removeUserProfile();
    window.location.href = "/";
  },
  getProfile: (): UserProfileStore | null => getUserProfile(),
  isLoggedIn: (): boolean => isAuthenticated(),
};

export const products = {
  list: (params?: {
    isFeatured?: boolean;
    isActive?: boolean;
    categoryId?: number;
    categoryIds?: string;
    collectionId?: number;
    collectionIds?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    isPreorder?: boolean;
    inStock?: boolean;
    attributeOptionIds?: string;
    sortBy?: string;
    page?: number;
    pageSize?: number;
  }) =>
    request<ProductCustomerDto[]>(`/products${buildParams(params || {})}`),
  detail: (id: number) =>
    request<ProductDetailCustomerDto>(`/products/${id}`),
  bySlug: async (slug: string): Promise<ProductDetailCustomerDto | null> => {
    const all = await request<ProductCustomerDto[]>("/products");
    let found = all.find((p) => p.slug === slug);
    if (!found) {
      const normalized = slug.replace(/-/g, " ").toLowerCase();
      found = all.find((p) => p.name?.toLowerCase() === normalized);
    }
    if (!found) return null;
    return request<ProductDetailCustomerDto>(`/products/${found.id}`);
  },
  byCollection: (slug: string, params?: { page?: number; pageSize?: number }) =>
    request<PaginatedList<ProductCustomerDto>>(`/products/collection/${slug}${buildParams(params || {})}`),
};

export const categories = {
  list: () =>
    request<CategoryDto[]>("/categories"),
};

export const collections = {
  list: () =>
    request<CollectionDto[]>("/collections"),
  bestSellers: (count: number = 3) =>
    request<CollectionDto[]>(`/collections/best-sellers?count=${count}`),
};

export const attributes = {
  list: () =>
    request<AttributeDto[]>("/attributes"),
};

interface RawCartItem {
  id: number;
  productVariantId: number;
  productId: number;
  quantity: number;
  price: number;
  sku: string;
  productName: string;
  productSlug: string;
  thumbnailUrl: string | null;
}

interface RawCartResponse {
  cartInfo: {
    id: number;
    userId: number | null;
    sessionId: string | null;
    items: RawCartItem[];
  };
  totalAmount: number;
  appliedCombo: {
    comboId: number;
    comboName: string;
    originalPrice: number;
    comboPrice: number;
    discountAmount: number;
  } | null;
  suggestedCombos: {
    comboId: number;
    comboName: string;
    originalPrice: number;
    comboPrice: number;
    discountAmount: number;
    allItemsInCart: boolean;
    matchingCount: number;
    totalCount: number;
  }[];
}

function dispatchCartUpdated(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("cart-updated"));
  }
}

export const cart = {
  get: async () => {
    const isLoggedIn = isAuthenticated();
    const params = new URLSearchParams();
    if (!isLoggedIn) params.set("sessionId", getOrCreateSessionId());
    const qs = params.toString();
    const raw = await request<RawCartResponse>(`/carts${qs ? `?${qs}` : ""}`);
    return {
      items: raw.cartInfo.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        productName: i.productName,
        productImage: i.thumbnailUrl || "",
        variantId: i.productVariantId,
        variantInfo: i.sku,
        unitPrice: i.price,
        quantity: i.quantity,
        stock: 0,
      })),
      totalPrice: raw.totalAmount,
      totalItems: raw.cartInfo.items.length,
      appliedCombo: raw.appliedCombo ?? null,
      suggestedCombos: raw.suggestedCombos ?? [],
    } satisfies CartDto;
  },
  add: (data: AddToCartRequest) => {
    const body: Record<string, unknown> = { productVariantId: data.productVariantId, quantity: data.quantity };
    if (!isAuthenticated()) body.sessionId = getOrCreateSessionId();
    return request<{ cartId: number; message: string }>("/carts/items", { method: "POST", body: JSON.stringify(body) }).then((res) => {
      dispatchCartUpdated();
      track("add_to_cart", "Product", data.productVariantId, { quantity: data.quantity });
      return res;
    });
  },
  updateQuantity: (itemId: number, quantity: number) =>
    request<{ message: string }>(`/carts/items/${itemId}`, { method: "PUT", body: JSON.stringify({ quantity }) }).then((res) => {
      dispatchCartUpdated();
      return res;
    }),
  remove: (itemId: number) =>
    request<{ message: string }>(`/carts/items/${itemId}`, { method: "DELETE" }).then((res) => {
      dispatchCartUpdated();
      track("remove_from_cart", null, null, { cartItemId: itemId });
      return res;
    }),
  merge: (data: { sessionId?: string; items?: { productVariantId: number; quantity: number }[] }) =>
    request<void>("/carts/merge", { method: "POST", body: JSON.stringify(data) }),
  clear: async () => {
    const cartData = await cart.get();
    const items = cartData.items;
    await Promise.all(items.map(item =>
      request<{ message: string }>(`/carts/items/${item.id}`, { method: "DELETE" })
    ));
    dispatchCartUpdated();
    items.forEach(item => track("remove_from_cart", "Product", item.variantId, { quantity: item.quantity }));
  },
};

export const orders = {
  list: (params?: { page?: number; pageSize?: number; status?: string }) =>
    request<PaginatedList<OrderCustomerDto>>(`/orders/my-orders${buildParams(params || {})}`),
  detail: (id: number) =>
    request<OrderCustomerDto>(`/orders/${id}`),
  getDetail: (id: number, userId?: number) =>
    request<OrderDetailDto>(`/orders/${id}${buildParams({ userId })}`),
  create: (data: CreateOrderRequest) =>
    request<CheckoutResult>("/orders/checkout", { method: "POST", body: JSON.stringify(data) }),
  cancel: (id: number) =>
    request<void>(`/orders/${id}/cancel`, { method: "POST" }),
};

export const wishlist = {
  get: () =>
    request<WishlistItemDto[]>("/wishlist"),
  add: (productId: number) =>
    request<void>("/wishlist", { method: "POST", body: JSON.stringify({ productId }) }).then((res) => {
      track("wishlist_add", "Product", productId);
      return res;
    }),
  remove: (id: number) =>
    request<void>(`/wishlist/${id}`, { method: "DELETE" }).then((res) => {
      track("wishlist_remove", "Product", id);
      return res;
    }),
};

export const profile = {
  get: () =>
    request<UserProfile>("/users/profile"),
  update: (data: Partial<UserProfile>) =>
    request<UserProfile>("/users/profile", { method: "PUT", body: JSON.stringify(data) }),
  addresses: {
    list: () =>
      request<AddressDto[]>("/users/address"),
    create: (data: AddressRequest) =>
      request<AddressDto>("/users/address", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: AddressRequest) =>
      request<AddressDto>(`/users/address/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) =>
      request<void>(`/users/address/${id}`, { method: "DELETE" }),
    setDefault: (id: number) =>
      request<void>(`/users/address/${id}/default`, { method: "PUT" }),
  },
};

export const vouchers = {
  list: () =>
    request<VoucherDto[]>("/vouchers"),
  getActive: () =>
    request<ActiveVoucherDto[]>("/vouchers/active"),
  apply: (data: ApplyVoucherRequest) =>
    request<ApplyVoucherResponse>("/vouchers/apply", { method: "POST", body: JSON.stringify(data) }),
};

export const shipping = {
  fee: (params: { province: string; district: string; ward: string; weight: number }) =>
    request<ShippingFeeOptionsResult>(`/shipping/fee${buildParams(params)}`),
};

export const payments = {
  create: (orderId: number, method: string) =>
    request<PaymentDto>("/payments", { method: "POST", body: JSON.stringify({ orderId, method }) }),
  momo: (orderId: number) =>
    request<{ payUrl: string }>("/payments/momo", { method: "POST", body: JSON.stringify({ orderId }) }),
};

export const locations = {
  provinces: () =>
    request<{ code: string; name: string }[]>("/locations/provinces"),
  districts: (provinceCode: string) =>
    request<{ code: string; name: string }[]>(`/locations/districts?provinceCode=${provinceCode}`),
  wards: (districtCode: string) =>
    request<{ code: string; name: string }[]>(`/locations/wards?districtCode=${districtCode}`),
};

export const reviews = {
  list: (productId: number, params?: { page?: number; pageSize?: number }) =>
    request<{ averageStars: number; totalRatings: number; items: ReviewDto[] }>(`/ratings/product/${productId}${buildParams(params || {})}`),
  create: (data: CreateReviewRequest) =>
    request<{ message: string }>("/ratings", { method: "POST", body: JSON.stringify(data) }),
  createByProduct: (data: { productId: number; stars: number; comment: string }) =>
    request<{ message: string }>("/ratings/product", { method: "POST", body: JSON.stringify(data) }),
  canReview: (productId: number) =>
    request<{ canReview: boolean }>(`/ratings/product/${productId}/can-review`),
};

export const recommendations = {
  similarProducts: (productId: number, take: number = 20) =>
    request<ProductCustomerDto[]>(`/recommendations/similar-products/${productId}?take=${take}`),
  collections: (collectionId: number, take: number = 4) =>
    request<CollectionRecommendationDto[]>(`/recommendations/collections/${collectionId}?take=${take}`),
  frequentlyBoughtTogether: (productId: number, take: number = 5) =>
    request<ProductCustomerDto[]>(`/recommendations/frequently-bought-together/${productId}?take=${take}`),
};

export const conversations = {
  my: (type?: string) => {
    const qs = type ? `?type=${type}` : "";
    return request<ConversationDto[]>(`/conversations/my${qs}`);
  },
  messages: (id: number) =>
    request<MessageDto[]>(`/conversations/${id}/messages`),
  create: (type: string = "Support", message?: string) =>
    request<{ conversationId: number }>("/conversations", {
      method: "POST",
      body: JSON.stringify({ message, type }),
    }),
  sendMessage: (id: number, messageText: string, imageUrls?: string[]) =>
    request<MessageDto>(`/conversations/${id}/messages`, {
      method: "POST",
      body: JSON.stringify({ messageText, imageUrls }),
    }),
};

export const aiChat = {
  chat: (data: AiChatRequest) =>
    request<AiChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const customRequestsApi = {
  my: () => request<CustomRequestDto[]>("/customrequests/my"),
  detail: (id: number) => request<CustomRequestDto>(`/customrequests/${id}/detail`),
  confirm: (id: number) =>
    request<{ message: string }>(`/customrequests/${id}/confirm`, {
      method: "POST",
    }),
  reject: (id: number) =>
    request<{ message: string }>(`/customrequests/${id}/reject`, {
      method: "POST",
    }),
};

export const upload = {
  file: async (file: File): Promise<{ url: string; fileName: string }> => {
    const token = getToken();
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/files/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const body = await res.text();
      let message = body || "Upload failed";
      try {
        const parsed = JSON.parse(body);
        message = parsed.Error || parsed.error || message;
      } catch { }
      throw new Error(message);
    }
    return res.json();
  },
};

export const combos = {
  forProduct: (productId: number) =>
    request<ProductComboCustomerDto[]>(`/combos/product/${productId}`),
  checkCart: (productIds: number[]) =>
    request<CartComboCheckResult>("/combos/check-cart", {
      method: "POST",
      body: JSON.stringify({ productIds }),
    }),
  applyToCart: (comboId: number) => {
    const body: Record<string, unknown> = { comboId };
    if (!isAuthenticated()) body.sessionId = getOrCreateSessionId();
    return request<{ message: string }>("/carts/combo", {
      method: "PATCH",
      body: JSON.stringify(body),
    }).then((res) => {
      dispatchCartUpdated();
      return res;
    });
  },
  removeFromCart: () => {
    const params = new URLSearchParams();
    if (!isAuthenticated()) params.set("sessionId", getOrCreateSessionId());
    const qs = params.toString();
    return request<{ message: string }>(`/carts/combo${qs ? `?${qs}` : ""}`, {
      method: "DELETE",
    }).then((res) => {
      dispatchCartUpdated();
      return res;
    });
  },
};
