import type {
  AttributeDto,
  BestSellerDto,
  CategoryAdminDto,
  CategoryRevenueDto,
  CollectionAdminDto,
  CollectionRevenueDto,
  ConversationDto,
  CreateComboRequest,
  CustomRequestAdminDto,
  DashboardStats,
  InventoryTransactionDto,
  LoginRequest,
  LoginResponse,
  LowConversionProductDto,
  MessageDto,
  RankedProductDto,
  MonthlyStatsDto,
  NewCustomerCountDto,
  NotificationDto,
  OrderAdminDto,
  OrderDetailAdminDto,
  OrderStatusCountDto,
  PaginatedList,
  PaymentMethodDto,
  PeriodRevenueDto,
  PeriodType,
  ProductAdminDto,
  ProductComboAdminDto,
  ProductDetailAdminDto,
  ProductVariantAdminDto,
  ProductVariantOptionDto,
  RatingAdminDto,
  RoleDto,
  SearchKeywordDto,
  ShippingProviderDto,
  ShipmentDto,
  TopCustomerDto,
  TopViewedProductDto,
  TrackingSummaryDto,
  UserAdminDto,
  VoucherAdminDto,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5097/api";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_token");
}

function setToken(token: string): void {
  localStorage.setItem("admin_token", token);
}

function removeToken(): void {
  localStorage.removeItem("admin_token");
}

function getUserRoles(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("admin_roles");
  return stored ? JSON.parse(stored) : [];
}

function setUserRoles(roles: string[]): void {
  localStorage.setItem("admin_roles", JSON.stringify(roles));
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    removeToken();
    removeUserProfile();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      window.location.href = "/login?reason=expired";
    }
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.text();
    let message = body || `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(body);
      message = parsed.Error || parsed.error || parsed.message || message;
    } catch {}
    throw new Error(message);
  }
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return res.json();
}

interface UserProfileStore {
  fullName: string;
  email: string;
  roles: string[];
}

function storeUserProfile(profile: LoginResponse): void {
  const store: UserProfileStore = {
    fullName: profile.fullName,
    email: profile.email,
    roles: profile.roles,
  };
  localStorage.setItem("admin_profile", JSON.stringify(store));
  setUserRoles(profile.roles);
}

function removeUserProfile(): void {
  localStorage.removeItem("admin_profile");
}

function getUserProfile(): UserProfileStore | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("admin_profile");
  return stored ? JSON.parse(stored) : null;
}

export const auth = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.text();
      let message = "Email hoặc mật khẩu không hợp lệ";
      try {
        const parsed = JSON.parse(body);
        message = parsed.message || parsed.title || parsed.error || message;
      } catch {
        if (body) message = body;
      }
      throw new Error(message);
    }
    const result: LoginResponse = await res.json();
    setToken(result.token);
    storeUserProfile(result);
    setUserRoles(result.roles);
    return result;
  },
  logout: (): void => {
    removeToken();
    removeUserProfile();
  },
  getToken,
  getUserProfile,
  getUserRoles,
  isAuthenticated: (): boolean => !!getToken(),
  isAdmin: (): boolean => getUserRoles().includes("Admin"),
};

export const dashboard = {
  stats: (days = 7) =>
    request<DashboardStats>(`/dashboard/stats?days=${days}`),
  bestSellers: (topN = 5) =>
    request<BestSellerDto[]>(`/dashboard/best-sellers?topN=${topN}`),
  revenueByPeriod: (period: PeriodType = "Monthly", numberOfPeriods = 12) =>
    request<PeriodRevenueDto[]>(`/dashboard/revenue-by-period?period=${period}&numberOfPeriods=${numberOfPeriods}`),
  revenueByCategory: (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams()
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    return request<CategoryRevenueDto[]>(`/dashboard/revenue-by-category?${params}`)
  },
  revenueByCollection: (dateFrom?: string, dateTo?: string) => {
    const params = new URLSearchParams()
    if (dateFrom) params.set("dateFrom", dateFrom)
    if (dateTo) params.set("dateTo", dateTo)
    return request<CollectionRevenueDto[]>(`/dashboard/revenue-by-collection?${params}`)
  },
  topCustomers: (topN = 5) =>
    request<TopCustomerDto[]>(`/dashboard/top-customers?topN=${topN}`),
  orderStatus: () =>
    request<OrderStatusCountDto[]>("/dashboard/order-status"),
  newCustomerCount: (days = 30) =>
    request<NewCustomerCountDto>(`/dashboard/new-customers?days=${days}`),
  monthlyStats: () =>
    request<MonthlyStatsDto>("/dashboard/monthly-stats"),
  topViewed: (days = 7, topN = 5) =>
    request<TopViewedProductDto[]>(`/dashboard/top-viewed?days=${days}&topN=${topN}`),
  searchKeywords: (days = 7, topN = 5) =>
    request<SearchKeywordDto[]>(`/dashboard/search-keywords?days=${days}&topN=${topN}`),
  trackingSummary: (days = 7) =>
    request<TrackingSummaryDto>(`/dashboard/tracking-summary?days=${days}`),
  lowConversion: (topN = 5) =>
    request<LowConversionProductDto[]>(`/dashboard/low-conversion?topN=${topN}`),
  topAddToCart: (days = 7, topN = 5) =>
    request<RankedProductDto[]>(`/dashboard/top-add-to-cart?days=${days}&topN=${topN}`),
  topWishlist: (days = 7, topN = 5) =>
    request<RankedProductDto[]>(`/dashboard/top-wishlist?days=${days}&topN=${topN}`),
  topSearched: (days = 7, topN = 5) =>
    request<RankedProductDto[]>(`/dashboard/top-searched?days=${days}&topN=${topN}`),
};

export const products = {
  variants: () => request<ProductVariantOptionDto[]>("/products/variants"),
  admin: (params?: {
    page?: number;
    pageSize?: number;
    search?: string;
    isActive?: boolean;
    isFeatured?: boolean;
    categoryId?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.isActive !== undefined)
      searchParams.set("isActive", String(params.isActive));
    if (params?.isFeatured !== undefined)
      searchParams.set("isFeatured", String(params.isFeatured));
    if (params?.categoryId)
      searchParams.set("categoryId", String(params.categoryId));
    const qs = searchParams.toString();
    return request<PaginatedList<ProductAdminDto>>(
      `/products/admin${qs ? `?${qs}` : ""}`
    );
  },
  adminDetail: (id: number) =>
    request<ProductDetailAdminDto>(`/products/admin/${id}`),
  create: (data: Partial<ProductDetailAdminDto> & { name: string; categoryId: number }) =>
    request<ProductDetailAdminDto>("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: Partial<ProductDetailAdminDto>) =>
    request<ProductDetailAdminDto>(`/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/products/${id}`, { method: "DELETE" }),
  createVariant: (productId: number, data: {
    sku: string; price: number; quantity?: number; isDefault?: boolean; isActive?: boolean; imageUrl?: string; attributeOptionIds?: number[];
  }) =>
    request<ProductVariantAdminDto>(`/products/${productId}/variants`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateVariant: (id: number, data: Partial<ProductVariantAdminDto> & { imageUrl?: string; attributeOptionIds?: number[] }) =>
    request<ProductVariantAdminDto>(`/products/variants/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteVariant: (id: number) =>
    request<{ message: string }>(`/products/variants/${id}`, { method: "DELETE" }),
};

export const orders = {
  admin: (params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.status) searchParams.set("status", params.status);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
    if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
    const qs = searchParams.toString();
    return request<PaginatedList<OrderAdminDto>>(
      `/orders${qs ? `?${qs}` : ""}`
    );
  },
  adminDetail: (id: number) =>
    request<OrderDetailAdminDto>(`/orders/detail/${id}`),
  updateStatus: (id: number, status: string) =>
    request<OrderDetailAdminDto>(`/orders/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

export const shipping = {
  providers: (includeInactive?: boolean) => {
    const qs = includeInactive ? "?includeInactive=true" : "";
    return request<ShippingProviderDto[]>(`/shipping-providers${qs}`);
  },
  list: (orderId: number) =>
    request<ShipmentDto[]>(`/orders/${orderId}/shipments`),
  listAll: (params?: { page?: number; pageSize?: number }) => {
    const qs = new URLSearchParams();
    if (params?.page) qs.set("page", String(params.page));
    if (params?.pageSize) qs.set("pageSize", String(params.pageSize));
    return request<PaginatedList<ShipmentDto>>(`/shipments?${qs}`);
  },
  create: (orderId: number, data: { shippingProviderId: number }) =>
    request<{ shipmentId: number; message: string }>(`/orders/${orderId}/ship`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  checkStatus: (shipmentId: number) =>
    request<{ carrierStatus: string; currentStatus: string; trackingLogs: { id: number; status: string; description: string | null; createdAt: string }[] }>(`/shipments/${shipmentId}/check-status`, {
      method: "POST",
    }),
};

export const shippingProviders = {
  admin: () => request<ShippingProviderDto[]>("/shippingproviders"),
  create: (data: { name: string; code: string }) =>
    request<ShippingProviderDto>("/shippingproviders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; code?: string; isActive?: boolean }) =>
    request<ShippingProviderDto>(`/shippingproviders/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/shippingproviders/${id}`, { method: "DELETE" }),
};

export const customRequests = {
  admin: (params?: { page?: number; pageSize?: number; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.status) searchParams.set("status", params.status);
    const qs = searchParams.toString();
    return request<PaginatedList<CustomRequestAdminDto>>(
      `/customrequests${qs ? `?${qs}` : ""}`
    );
  },
  update: (id: number, data: { status?: string; quotedPrice?: number; estimatedFinishDate?: string | null }) =>
    request<CustomRequestAdminDto>(`/customrequests/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
};

export const adminUsers = {
  list: (params?: { page?: number; pageSize?: number; search?: string; isActive?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.search) searchParams.set("search", params.search);
    if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
    const qs = searchParams.toString();
    return request<PaginatedList<UserAdminDto>>(
      `/admin/users${qs ? `?${qs}` : ""}`
    );
  },
  toggleActive: (id: number) =>
    request<{ isActive: boolean; message: string }>(`/admin/users/${id}/toggle-active`, {
      method: "PUT",
    }),
  create: (data: { email: string; password: string; fullName: string; phone?: string; roleIds: number[] }) =>
    request<UserAdminDto>("/admin/users", { method: "POST", body: JSON.stringify(data) }),
  assignRole: (userId: number, roleId: number) =>
    request<boolean>(`/admin/users/${userId}/roles/${roleId}`, { method: "POST" }),
  removeRole: (userId: number, roleId: number) =>
    request<boolean>(`/admin/users/${userId}/roles/${roleId}`, { method: "DELETE" }),
};

export const categories = {
  admin: () => request<CategoryAdminDto[]>("/categories?includeInactive=true"),
  create: (data: { name: string; slug?: string; isActive?: boolean }) =>
    request<CategoryAdminDto>("/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; slug?: string; isActive?: boolean }) =>
    request<CategoryAdminDto>(`/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/categories/${id}`, { method: "DELETE" }),
  getProducts: (id: number) =>
    request<ProductAdminDto[]>(`/categories/${id}/products`),
  createProduct: (id: number, data: { name: string; slug?: string; shortDescription?: string; description?: string; isFeatured?: boolean; isPreorder?: boolean; isActive?: boolean }) =>
    request<{ message: string; id: number }>(`/categories/${id}/products`, { method: "POST", body: JSON.stringify(data) }),
};

export const collections = {
  admin: () => request<CollectionAdminDto[]>("/collections?includeInactive=true"),
  create: (data: { name: string; slug?: string; bannerImageUrl?: string; isActive?: boolean }) =>
    request<CollectionAdminDto>("/collections", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; slug?: string; bannerImageUrl?: string; isActive?: boolean }) =>
    request<CollectionAdminDto>(`/collections/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/collections/${id}`, { method: "DELETE" }),
  getProducts: (id: number) =>
    request<ProductAdminDto[]>(`/collections/${id}/products`),
  addProduct: (id: number, productId: number) =>
    request<{ message: string }>(`/collections/${id}/products/${productId}`, { method: "POST" }),
  removeProduct: (id: number, productId: number) =>
    request<{ message: string }>(`/collections/${id}/products/${productId}`, { method: "DELETE" }),
};

export const vouchers = {
  admin: (params?: { page?: number; pageSize?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    const qs = searchParams.toString();
    return request<PaginatedList<VoucherAdminDto>>(
      `/vouchers${qs ? `?${qs}` : ""}`
    );
  },
  create: (data: {
    code: string; description?: string; discountType: string; discountValue: number;
    minOrderValue?: number; maxDiscountValue?: number; maxUses?: number; maxUsesPerUser?: number;
    startDate: string; endDate: string;
  }) =>
    request<VoucherAdminDto>("/vouchers", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<{
    code: string; description: string; discountType: string; discountValue: number;
    minOrderValue: number; maxDiscountValue: number; maxUses: number; maxUsesPerUser: number;
    startDate: string; endDate: string; isActive: boolean;
  }>) =>
    request<VoucherAdminDto>(`/vouchers/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ message: string }>(`/vouchers/${id}`, { method: "DELETE" }),
};

export const combos = {
  list: (params?: { page?: number; pageSize?: number; isActive?: boolean; isAutoGenerated?: boolean; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.isActive !== undefined) searchParams.set("isActive", String(params.isActive));
    if (params?.isAutoGenerated !== undefined) searchParams.set("isAutoGenerated", String(params.isAutoGenerated));
    if (params?.search) searchParams.set("search", params.search);
    const qs = searchParams.toString();
    return request<PaginatedList<ProductComboAdminDto>>(
      `/combos${qs ? `?${qs}` : ""}`
    );
  },
  getById: (id: number) =>
    request<ProductComboAdminDto>(`/combos/${id}`),
  create: (data: CreateComboRequest) =>
    request<{ id: number }>("/combos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Partial<CreateComboRequest & { isActive: boolean }>) =>
    request<void>(`/combos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<void>(`/combos/${id}`, { method: "DELETE" }),
  approve: (id: number, discountOverride?: number) =>
    request<void>(`/combos/${id}/approve`, {
      method: "PATCH",
      body: JSON.stringify(discountOverride !== undefined ? { discountOverride } : {}),
    }),
  toggle: (id: number) =>
    request<void>(`/combos/${id}/toggle`, { method: "PATCH" }),
};

export const ratings = {
  admin: (params?: { page?: number; pageSize?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    const qs = searchParams.toString();
    return request<PaginatedList<RatingAdminDto>>(
      `/ratings${qs ? `?${qs}` : ""}`
    );
  },
  delete: (id: number) =>
    request<{ message: string }>(`/ratings/${id}`, { method: "DELETE" }),
};

export const conversations = {
  admin: (params?: { type?: string; search?: string; page?: number; pageSize?: number; hasCustomRequests?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set("type", params.type);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    if (params?.hasCustomRequests) searchParams.set("hasCustomRequests", "true");
    const qs = searchParams.toString();
    return request<PaginatedList<ConversationDto>>(`/conversations${qs ? `?${qs}` : ""}`);
  },
  messages: (conversationId: number) =>
    request<MessageDto[]>(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: number, messageText: string, imageUrls?: string[]) =>
    request<MessageDto>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ messageText, imageUrls, sender: "Admin" }),
    }),
  createCustomRequest: (conversationId: number, description: string, quotedPrice?: number | null, estimatedFinishDate?: string | null, imageUrl?: string | null) =>
    request<{ message: string }>(`/conversations/${conversationId}/create-request`, {
      method: "POST",
      body: JSON.stringify({ description, quotedPrice, estimatedFinishDate, imageUrl }),
    }),
};

export const inventory = {
  admin: (params?: { page?: number; pageSize?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.pageSize) searchParams.set("pageSize", String(params.pageSize));
    const qs = searchParams.toString();
    return request<PaginatedList<InventoryTransactionDto>>(
      `/inventorytransactions${qs ? `?${qs}` : ""}`
    );
  },
  create: (data: {
    productVariantId: number; transactionType: string; quantity: number; note?: string;
  }) =>
    request<InventoryTransactionDto>("/inventorytransactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export const paymentMethods = {
  admin: () => request<PaymentMethodDto[]>("/paymentmethods"),
  create: (data: { name: string }) =>
    request<PaymentMethodDto>("/paymentmethods", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name?: string; isActive?: boolean }) =>
    request<PaymentMethodDto>(`/paymentmethods/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/paymentmethods/${id}`, { method: "DELETE" }),
};

export const roles = {
  admin: () => request<RoleDto[]>("/roles"),
  create: (data: { code: string; name: string }) =>
    request<RoleDto>("/roles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: { code?: string; name?: string; isActive?: boolean }) =>
    request<RoleDto>(`/roles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) =>
    request<{ message: string }>(`/roles/${id}`, { method: "DELETE" }),
};

export const attributes = {
  admin: () => request<AttributeDto[]>("/attributes"),
  create: (data: { name: string }) =>
    request<AttributeDto>("/attributes", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  update: (id: number, data: { name: string }) =>
    request<AttributeDto>(`/attributes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/attributes/${id}`, { method: "DELETE" }),
  createOption: (attributeId: number, value: string) =>
    request<AttributeDto>(`/attributes/${attributeId}/options`, {
      method: "POST",
      body: JSON.stringify({ value }),
    }),
  deleteOption: (id: number) =>
    request<{ message: string }>(`/attributes/options/${id}`, { method: "DELETE" }),
};

export const notifications = {
  recent: () => request<NotificationDto[]>("/admin/notifications/recent"),
};

export { setToken, storeUserProfile, setUserRoles };
