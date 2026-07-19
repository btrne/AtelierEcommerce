using Microsoft.EntityFrameworkCore;
using Atelier.Domain.Entities;

namespace Atelier.Application.Common.Interfaces
{
    public interface IApplicationDbContext
    {
        // 1. Nhóm Người dùng & Phân quyền
        DbSet<User> Users { get; }
        DbSet<Role> Roles { get; }
        DbSet<UserRole> UserRoles { get; }
        DbSet<UserAddress> UserAddresses { get; }

        // 2. Nhóm Sản phẩm & Danh mục
        DbSet<Category> Categories { get; }
        DbSet<Collection> Collections { get; }
        DbSet<ProductCollection> ProductCollections { get; }
        DbSet<Product> Products { get; }
        DbSet<ProductVariantImage> ProductVariantImages { get; }
        DbSet<ProductAttribute> Attributes { get; }
        DbSet<AttributeOption> AttributeOptions { get; }
        DbSet<ProductVariant> ProductVariants { get; }
        DbSet<VariantAttribute> VariantAttributes { get; }

        // 3. Nhóm Giỏ hàng
        DbSet<Cart> Carts { get; }
        DbSet<CartItem> CartItems { get; }

        // 4. Nhóm Đơn hàng & Thanh toán
        DbSet<Order> Orders { get; }
        DbSet<OrderItem> OrderItems { get; }
        DbSet<OrderLog> OrderLogs { get; }
        DbSet<Payment> Payments { get; }
        DbSet<PaymentMethod> PaymentMethods { get; }

        // 5. Nhóm Custom Request & Yêu thích
        DbSet<CustomRequest> CustomRequests { get; }
        DbSet<Wishlist> Wishlists { get; }

        // 6. Nhóm Khuyến mãi & Kho
        DbSet<Voucher> Vouchers { get; }
        DbSet<VoucherUsage> VoucherUsages { get; }
        DbSet<InventoryTransaction> InventoryTransactions { get; }

        // 7. Nhóm Vận chuyển
        DbSet<ShippingProvider> ShippingProviders { get; }
        DbSet<Shipment> Shipments { get; }
        DbSet<ShipmentTrackingLog> ShipmentTrackingLogs { get; }

        // 8. Nhóm Đánh giá & Hỗ trợ (Chat)
        DbSet<Rating> Ratings { get; }
        DbSet<Conversation> Conversations { get; }
        DbSet<Message> Messages { get; }
        DbSet<MessageImage> MessageImages { get; }
        DbSet<AiSuggestionLog> AiSuggestionLogs { get; }
        DbSet<MessageProductSuggestion> MessageProductSuggestions { get; }

        // 10. Nhóm Analytics (Lưu vết & Gợi ý)
        DbSet<UserEvent> UserEvents { get; }
        DbSet<ProductAssociationRule> ProductAssociationRules { get; }

        // 11. Nhóm Combo
        DbSet<ProductCombo> ProductCombos { get; }
        DbSet<ProductComboItem> ProductComboItems { get; }

        // 9. Nhóm Địa chỉ hành chính
        DbSet<Province> Provinces { get; }
        DbSet<District> Districts { get; }
        DbSet<Ward> Wards { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    }
}