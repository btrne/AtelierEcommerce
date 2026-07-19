export interface PaginatedList<T> {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface DashboardStats {
  summary: { totalOrders: number; totalRevenue: number }
  dailyStats: { date: string; totalRevenue: number; orderCount: number }[]
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  email: string
  fullName: string
  roles: string[]
}

export interface ProductAdminDto {
  id: number
  name: string
  slug: string | null
  shortDescription: string | null
  categoryName: string
  categoryId: number
  minPrice: number
  totalStock: number
  variantCount: number
  thumbnailUrl: string | null
  isFeatured: boolean
  isPreorder: boolean
  isActive: boolean
  createdAt: string
}

export interface ProductDetailAdminDto {
  id: number
  name: string
  slug: string | null
  shortDescription: string | null
  description: string | null
  story: string | null
  categoryId: number
  categoryName: string
  isFeatured: boolean
  isPreorder: boolean
  isActive: boolean
  viewsCount: number
  createdAt: string
  collectionIds: number[]
  collectionNames: string[]
  variants: ProductVariantAdminDto[]
}

export interface ProductVariantAdminDto {
  id: number
  sku: string
  price: number
  quantity: number
  weight: number | null
  isDefault: boolean
  isActive: boolean
  thumbnailUrl: string | null
  images: string[]
  attributes: VariantAttributeDto[]
}

export interface VariantAttributeDto {
  attributeId: number
  attributeName: string
  optionId: number
  optionValue: string
}

export interface OrderAdminDto {
  id: number
  orderCode: string
  userId: number | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  shippingContactName: string
  shippingPhone: string
  shippingAddress: string
  orderStatus: string
  subtotalAmount: number
  shippingFee: number
  voucherDiscount: number | null
  totalAmount: number
  paymentMethodName: string | null
  paymentStatus: string | null
  paidAt: string | null
  itemCount: number
  createdAt: string
  cancelledAt: string | null
}

export interface OrderDetailAdminDto {
  id: number
  orderCode: string
  userId: number | null
  customerName: string | null
  customerEmail: string | null
  customerPhone: string | null
  shippingContactName: string
  shippingPhone: string
  shippingProvince: string
  shippingDistrict: string
  shippingWard: string
  shippingDetail: string
  orderStatus: string
  preferredCarrierCode: string | null
  subtotalAmount: number
  shippingFee: number
  voucherDiscount: number | null
  totalAmount: number
  voucherCode: string | null
  paymentMethodName: string | null
  createdAt: string
  cancelledAt: string | null
  items: OrderItemAdminDto[]
  payments: PaymentDto[]
  orderLogs: OrderLogDto[]
}

export interface OrderItemAdminDto {
  id: number
  productVariantId: number
  productName: string
  variantName: string
  quantity: number
  unitPrice: number
  imageUrl: string | null
}

export interface PaymentDto {
  id: number
  transactionCode: string | null
  amount: number
  status: string
  paidAt: string | null
}

export interface OrderLogDto {
  id: number
  orderId: number
  fromStatus: string | null
  toStatus: string
  note: string | null
  createdAt: string
}

export interface ShippingProviderDto {
  id: number
  name: string
  code: string
  isActive: boolean
}

export interface ShipmentTrackingLogDto {
  id: number
  shipmentId: number
  status: string
  description: string | null
  createdAt: string
}

export interface ShipmentDto {
  id: number
  orderId: number
  orderCode: string | null
  shippingProviderId: number
  shippingProviderName: string | null
  trackingCode: string | null
  shippingFee: number
  status: string
  deliveryAttemptCount: number
  estimatedDeliveryDate: string | null
  shippedAt: string | null
  deliveredAt: string | null
  createdAt: string
  trackingLogs: ShipmentTrackingLogDto[]
}

export interface CustomRequestAdminDto {
  id: number
  userId: number
  userName: string | null
  description: string | null
  quotedPrice: number | null
  estimatedFinishDate: string | null
  status: string
  conversationId?: number
  customerConfirmedAt?: string | null
  paidAt?: string | null
  startedAt?: string | null
  finishedAt?: string | null
  cancelledAt?: string | null
  createdAt: string
}

export interface UserAdminDto {
  id: number
  email: string
  fullName: string
  phone: string
  isActive: boolean
  createdAt: string
  orderCount: number
  totalSpent: number
  roles: string[]
}

export interface CategoryAdminDto {
  id: number
  name: string
  slug: string | null
  isActive: boolean
  productCount: number
}

export interface CollectionAdminDto {
  id: number
  name: string
  slug: string | null
  bannerImageUrl: string | null
  description: string | null
  releaseDate: string | null
  isActive: boolean
  createdAt: string
  productCount: number
}

export interface VoucherAdminDto {
  id: number
  code: string
  description: string | null
  discountType: string
  discountValue: number
  minOrderValue: number
  maxDiscountValue: number
  maxUses: number
  maxUsesPerUser: number
  currentUses: number
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: string
}

export interface RatingAdminDto {
  id: number
  userId: number
  userName: string | null
  productName: string | null
  stars: number
  comment: string | null
  createdAt: string
}

export interface ConversationDto {
  id: number
  userId: number
  userName: string | null
  title: string | null
  lastMessage: string | null
  messageCount: number
  startedAt: string
  lastMessageAt: string | null
  type: string
}

export interface AiProductSuggestion {
  id: number
  name: string
  description?: string
  price: number
  priceMin?: number
  priceMax?: number
  imageUrl?: string
  slug?: string
  categoryName?: string
}

export interface MessageDto {
  id: number
  conversationId: number
  sender: string
  messageText: string
  imageUrls: string[]
  productSuggestions?: AiProductSuggestion[]
  createdAt: string
}

export interface InventoryTransactionDto {
  id: number
  productVariantId: number
  variantSku: string | null
  productName: string | null
  transactionType: string
  quantity: number
  note: string | null
  createdAt: string
}

export interface PaymentMethodDto {
  id: number
  name: string
  isActive: boolean
}

export interface RoleDto {
  id: number
  code: string
  name: string
  isActive: boolean
  userCount: number
}

export interface AttributeDto {
  id: number
  name: string
  options: AttributeOptionDto[]
}

export interface AttributeOptionDto {
  id: number
  attributeId: number
  value: string
}

export interface UserProfileDto {
  id: number
  email: string
  fullName: string
  phone: string
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
}

export interface BestSellerDto {
  productVariantId: number
  productName: string
  variantName: string
  imageUrl: string | null
  totalQuantity: number
  totalRevenue: number
}

export interface PeriodRevenueDto {
  label: string
  startDate: string
  totalRevenue: number
  orderCount: number
}

export type PeriodType = "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Yearly"

export interface CategoryRevenueDto {
  categoryName: string
  categoryId: number
  totalRevenue: number
  orderCount: number
  productCount: number
}

export interface CollectionRevenueDto {
  collectionId: number
  collectionName: string
  totalRevenue: number
  orderCount: number
  productCount: number
}

export interface TopCustomerDto {
  userId: number
  fullName: string
  email: string
  phone: string | null
  orderCount: number
  totalSpent: number
}

export interface ProductVariantOptionDto {
  id: number;
  sku: string;
  productName: string;
  quantity: number;
  attributeSummary?: string;
  thumbnailUrl?: string;
}

export interface OrderStatusCountDto {
  status: string
  count: number
  totalAmount: number
}

export interface NewCustomerCountDto {
  currentPeriod: number
  previousPeriod: number
}

export interface NotificationDto {
  id: string
  type: string
  title: string
  body?: string
  referenceType: string
  referenceId: number
  createdAt: string
}

export interface MonthlyStatsDto {
  revenue: number
  prevRevenue: number
  totalOrders: number
  prevTotalOrders: number
  newCustomers: number
  prevNewCustomers: number
}

export interface TopViewedProductDto {
  productId: number
  productName: string
  views: number
  thumbnailUrl: string | null
}

export interface SearchKeywordDto {
  keyword: string
  count: number
}

export interface TrackingSummaryDto {
  totalViews: number
  totalSearches: number
  totalAddToCart: number
  totalOrders: number
  conversionRate: number
}

export interface LowConversionProductDto {
  productId: number
  productName: string
  views: number
  cartAdds: number
  conversionRate: number
  thumbnailUrl: string | null
}

export interface RankedProductDto {
  productId: number
  productName: string
  count: number
  thumbnailUrl: string | null
}

export interface ProductComboAdminDto {
  id: number
  name: string
  description: string | null
  products: ProductAdminDto[]
  productCount: number
  discountType: string
  discountValue: number
  suggestedDiscountValue: number | null
  originalTotalPrice: number
  comboPrice: number
  maxUses: number
  currentUses: number
  support: number
  confidence: number
  lift: number
  weightedUtility: number
  isActive: boolean
  isAutoGenerated: boolean
  createdAt: string
}

export interface CreateComboRequest {
  name: string
  description?: string
  productIds: number[]
  discountType: string
  discountValue: number
  maxUses: number
}


