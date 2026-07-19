export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  id: number;
  token: string;
  fullName: string;
  email: string;
  roles: string[];
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UserProfile {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  avatarUrl: string;
  defaultAddress: AddressDto | null;
  totalSpent: number;
  orderCount: number;
  addresses: AddressDto[];
}

export interface AddressDto {
  id: number;
  fullName: string;
  phoneNumber: string;
  street: string;
  ward: string;
  district: string;
  city: string;
  isDefault: boolean;
}

export interface AddressRequest {
  contactName: string;
  phone: string;
  detailAddress: string;
  wardName: string;
  districtName: string;
  provinceName: string;
  isDefault: boolean;
}

export interface ProductCustomerDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  minPrice: number;
  maxPrice: number;
  thumbnailUrl: string | null;
  categoryName: string;
  categoryId: number;
  collectionNames: string[];
  collectionIds: number[];
  isFeatured: boolean;
  isPreorder: boolean;
  isInStock: boolean;
  totalSold: number;
  viewsCount: number;
  ratingAverage: number;
}

export interface ProductDetailCustomerDto {
  id: number;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  story: string | null;
  ratingAverage: number;
  categoryName: string;
  collectionId: number | null;
  collectionName: string | null;
  collectionSlug: string | null;
  variants: ProductVariantDto[];
}

export interface VariantAttributeDto {
  attributeId: number;
  attributeName: string;
  optionId: number;
  optionValue: string;
}

export interface ProductVariantDto {
  id: number;
  sku: string;
  price: number;
  weight: number | null;
  stockQuantity: number;
  thumbnailUrl: string | null;
  images: string[];
  attributes?: VariantAttributeDto[];
}

export interface CartItemDto {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  variantId: number;
  variantInfo: string;
  unitPrice: number;
  quantity: number;
  stock: number;
}

export interface CartAppliedCombo {
  comboId: number;
  comboName: string;
  originalPrice: number;
  comboPrice: number;
  discountAmount: number;
}

export interface CartSuggestedCombo {
  comboId: number;
  comboName: string;
  originalPrice: number;
  comboPrice: number;
  discountAmount: number;
  allItemsInCart: boolean;
  matchingCount: number;
  totalCount: number;
}

export interface CartDto {
  items: CartItemDto[];
  totalPrice: number;
  totalItems: number;
  appliedCombo: CartAppliedCombo | null;
  suggestedCombos: CartSuggestedCombo[];
}

export interface AddToCartRequest {
  productVariantId: number;
  quantity: number;
  sessionId?: string;
}

export interface OrderCustomerDto {
  id: number;
  orderCode: string;
  status: string;
  totalAmount: number;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  items: OrderItemDto[];
}

export interface OrderItemDto {
  id?: number;
  productName: string;
  productImage: string;
  variantInfo: string;
  unitPrice: number;
  quantity: number;
  hasReviewed?: boolean;
}

export interface CheckoutItem {
  productVariantId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  userId?: number;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  shippingProvince: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingFee: number;
  preferredCarrierCode?: string;
  paymentMethodId: number;
  voucherId?: number;
  voucherDiscount?: number;
  appliedComboId?: number;
  comboDiscount?: number;
  cartItems?: CheckoutItem[];
  customRequestId?: number;
  notes?: string;
}

export interface CheckoutResult {
  orderId: number;
  paymentUrl?: string;
  message: string;
}

export interface ActiveVoucherDto {
  code: string;
  description?: string;
  discountType: string;
  discountValue: number;
  minOrderValue: number;
  maxDiscountValue: number;
}

export interface ApplyVoucherRequest {
  code: string;
  orderTotal: number;
  userId?: number;
}

export interface ApplyVoucherResponse {
  valid: boolean;
  voucherId?: number;
  code?: string;
  discountType?: string;
  discountValue?: number;
  discount?: number;
  message: string;
}

export interface WishlistItemDto {
  id: number;
  productId: number;
  productName: string;
  productImage: string;
  basePrice: number;
}

export interface CollectionDto {
  id: number;
  name: string;
  slug: string | null;
  bannerImageUrl: string | null;
  description: string | null;
  releaseDate: string | null;
  isActive: boolean;
  createdAt: string;
  productCount: number;
  totalSold: number;
}

export interface CategoryDto {
  id: number;
  name: string;
  slug: string;
}

export interface VoucherDto {
  id: number;
  code: string;
  discountPercent: number;
  maxDiscount: number;
  minOrder: number;
  expiryDate: string;
}

export interface OrderLogDto {
  id: number;
  orderId: number;
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
}

export interface ShipmentTrackingLogDto {
  id: number;
  shipmentId: number;
  status: string;
  description: string | null;
  createdAt: string;
}

export interface CustomerShipmentDto {
  id: number;
  orderId: number;
  shippingProviderName: string | null;
  trackingCode: string | null;
  shippingFee: number;
  status: string;
  deliveryAttemptCount: number;
  estimatedDeliveryDate: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  trackingLogs: ShipmentTrackingLogDto[];
}

export interface OrderDetailDto {
  id: number;
  orderCode: string;
  status: string;
  subtotal: number;
  shippingFee: number;
  voucherDiscount: number | null;
  total: number;
  paymentMethod: string;
  shippingContactName: string;
  shippingPhone: string;
  shippingAddress: string;
  createdAt: string;
  cancelledAt: string | null;
  items: OrderItemDto[];
  orderLogs: OrderLogDto[];
  shipments: CustomerShipmentDto[];
}

export interface ShippingFeeOption {
  fee: number;
  leadTime: number;
  isSuccess: boolean;
  errorMessage: string | null;
  carrierCode: string;
  serviceName: string;
  description: string;
}

export interface ShippingFeeOptionsResult {
  options: ShippingFeeOption[];
}

export interface PaymentDto {
  id: number;
  orderId: number;
  amount: number;
  method: string;
  status: string;
  createdAt: string;
}

export interface PaginatedList<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface ReviewDto {
  id: number;
  userId: number;
  userName: string;
  stars: number;
  comment: string;
  createdAt: string;
}

export interface CreateReviewRequest {
  orderItemId: number;
  stars: number;
  comment: string;
}

export interface AttributeDto {
  id: number;
  name: string;
  options: AttributeOptionDto[];
  productCount: number;
}

export interface AttributeOptionDto {
  id: number;
  attributeId: number;
  value: string;
}

export interface CollectionRecommendationDto {
  id: number;
  name: string;
  slug: string | null;
  bannerImageUrl: string | null;
  productCount: number;
}

export interface ConversationDto {
  id: number;
  userId: number;
  userName?: string;
  type: string;
  title?: string;
  lastMessage?: string;
  messageCount: number;
  startedAt: string;
  lastMessageAt?: string;
}

export interface MessageDto {
  id: number;
  conversationId: number;
  sender: string;
  messageText: string;
  imageUrls: string[];
  productSuggestions?: AiProductSuggestion[];
  createdAt: string;
}

export interface AiChatRequest {
  message: string;
  conversationId?: number;
  history?: { role: string; text: string }[];
}

export interface AiProductSuggestion {
  id: number;
  name: string;
  description?: string;
  price: number;
  priceMin?: number;
  priceMax?: number;
  imageUrl?: string;
  slug?: string;
  categoryName?: string;
}

export interface AiChatResponse {
  reply: string;
  conversationId?: number;
  transferTo?: string;
  transferReason?: string;
  productSuggestions?: AiProductSuggestion[];
}

export interface CustomRequestDto {
  id: number;
  userId: number;
  description?: string;
  imageUrl?: string;
  quotedPrice?: number;
  estimatedFinishDate?: string;
  status: string;
  customerConfirmedAt?: string;
  conversationId?: number;
  createdAt: string;
}

export interface ProductComboCustomerDto {
  id: number;
  name: string;
  description: string | null;
  products: ProductCustomerDto[];
  discountType: string;
  discountValue: number;
  originalTotalPrice: number;
  comboPrice: number;
  isAvailable: boolean;
  unavailableReason: string | null;
}

export interface CartComboCheckResult {
  applicableCombos: ApplicableComboDto[];
}

export interface ApplicableComboDto {
  comboId: number;
  comboName: string;
  matchingProductIds: number[];
  missingProductIds: number[];
  discountAmount: number;
  comboPrice: number;
  originalPrice: number;
  allItemsInCart: boolean;
}
