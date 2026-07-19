using Atelier.Domain.Entities;
using Atelier.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Infrastructure.Data;

public class ApplicationDbContext : DbContext, IApplicationDbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

    // 1. Nhóm Người dùng & Phân quyền
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<UserAddress> UserAddresses { get; set; }

    // 2. Nhóm Sản phẩm & Danh mục
    public DbSet<Category> Categories { get; set; }
    public DbSet<Collection> Collections { get; set; }
    public DbSet<ProductCollection> ProductCollections { get; set; }
    public DbSet<Product> Products { get; set; }
    public DbSet<ProductVariantImage> ProductVariantImages { get; set; }
    public DbSet<ProductAttribute> Attributes { get; set; }
    public DbSet<AttributeOption> AttributeOptions { get; set; }
    public DbSet<ProductVariant> ProductVariants { get; set; }
    public DbSet<VariantAttribute> VariantAttributes { get; set; }

    // 3. Nhóm Giỏ hàng
    public DbSet<Cart> Carts { get; set; }
    public DbSet<CartItem> CartItems { get; set; }

    // 4. Nhóm Đơn hàng & Thanh toán
    public DbSet<Order> Orders { get; set; }
    public DbSet<OrderItem> OrderItems { get; set; }
    public DbSet<OrderLog> OrderLogs { get; set; }
    public DbSet<Payment> Payments { get; set; }
    public DbSet<PaymentMethod> PaymentMethods { get; set; }

    // 5. Nhóm Custom Request (Túi thiết kế riêng) & Yêu thích
    public DbSet<CustomRequest> CustomRequests { get; set; }
    public DbSet<Wishlist> Wishlists { get; set; }

    // 6. Nhóm Khuyến mãi & Kho
    public DbSet<Voucher> Vouchers { get; set; }
    public DbSet<VoucherUsage> VoucherUsages { get; set; }
    public DbSet<InventoryTransaction> InventoryTransactions { get; set; }

    // 7. Nhóm Vận chuyển
    public DbSet<ShippingProvider> ShippingProviders { get; set; }
    public DbSet<Shipment> Shipments { get; set; }
    public DbSet<ShipmentTrackingLog> ShipmentTrackingLogs { get; set; }

    // 8. Nhóm Đánh giá & Hỗ trợ (Chat)
    public DbSet<Rating> Ratings { get; set; }
    public DbSet<Conversation> Conversations { get; set; }
    public DbSet<Message> Messages { get; set; }
    public DbSet<MessageImage> MessageImages { get; set; }
    public DbSet<AiSuggestionLog> AiSuggestionLogs { get; set; }
    public DbSet<MessageProductSuggestion> MessageProductSuggestions { get; set; }

    // 10. Nhóm Analytics (Lưu vết & Gợi ý)
    public DbSet<UserEvent> UserEvents { get; set; }
    public DbSet<ProductAssociationRule> ProductAssociationRules { get; set; }

    // 11. Nhóm Combo
    public DbSet<ProductCombo> ProductCombos { get; set; }
    public DbSet<ProductComboItem> ProductComboItems { get; set; }

    // 9. Nhóm Địa chỉ hành chính
    public DbSet<Province> Provinces { get; set; }
    public DbSet<District> Districts { get; set; }
    public DbSet<Ward> Wards { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Chỉ định Khóa chính phức hợp (Composite Key) cho các bảng trung gian n-n
        modelBuilder.Entity<ProductCollection>().HasKey(x => new { x.ProductId, x.CollectionId });
        modelBuilder.Entity<UserRole>().HasKey(x => new { x.UserId, x.RoleId });
        modelBuilder.Entity<VariantAttribute>().HasKey(x => new { x.ProductVariantId, x.AttributeOptionId });
        modelBuilder.Entity<Wishlist>().HasKey(x => new { x.UserId, x.ProductId });
        modelBuilder.Entity<ProductAttribute>().HasKey(a => a.Id);
        modelBuilder.Entity<ProductVariantImage>().HasKey(x => x.Id);

        modelBuilder.Entity<ProductVariantImage>()
            .HasOne(x => x.ProductVariant)
            .WithMany(x => x.ProductVariantImages)
            .HasForeignKey(x => x.ProductVariantId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MessageImage>()
            .HasOne(x => x.Message)
            .WithMany(x => x.Images)
            .HasForeignKey(x => x.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<MessageProductSuggestion>()
            .HasOne(x => x.Message)
            .WithMany(x => x.ProductSuggestions)
            .HasForeignKey(x => x.MessageId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Payment>()
            .HasOne(x => x.PaymentMethod)
            .WithMany(pm => pm.Payments)
            .HasForeignKey(x => x.PaymentMethodId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Code = "Admin", Name = "Quản trị viên", IsActive = true },
            new Role { Id = 2, Code = "Staff", Name = "Nhân viên", IsActive = true },
            new Role { Id = 3, Code = "Customer", Name = "Khách hàng", IsActive = true }
        );

        modelBuilder.Entity<PaymentMethod>().HasData(
            new PaymentMethod { Id = 1, Name = "COD", IsActive = true },
            new PaymentMethod { Id = 2, Name = "VNPAY", IsActive = true },
            new PaymentMethod { Id = 3, Name = "MoMo", IsActive = true }
        );

        modelBuilder.Entity<ShippingProvider>().HasData(
            new ShippingProvider { Id = 1, Name = "Giao Hàng Nhanh", Code = "GHN", IsActive = true },
            new ShippingProvider { Id = 4, Name = "Lalamove", Code = "Lalamove", IsActive = true }
        );

        var now = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc);
        var forever = new DateTime(2099, 12, 31, 23, 59, 59, DateTimeKind.Utc);
        modelBuilder.Entity<Voucher>().HasData(
            new Voucher
            {
                Id = 1,
                Code = "ATELIERWELCOME",
                Description = "Giảm 10% cho đơn hàng đầu tiên",
                DiscountType = "Percentage",
                DiscountValue = 10m,
                MinOrderValue = 0m,
                MaxDiscountValue = 500000m,
                MaxUses = 99999,
                MaxUsesPerUser = 1,
                StartDate = now,
                EndDate = forever,
                IsActive = true,
                CreatedAt = now,
            },
            new Voucher
            {
                Id = 2,
                Code = "CRAFTSMANSHIP",
                Description = "Giảm 150.000đ phí vận chuyển hỏa tốc",
                DiscountType = "Fixed",
                DiscountValue = 150000m,
                MinOrderValue = 0m,
                MaxDiscountValue = 150000m,
                MaxUses = 99999,
                MaxUsesPerUser = 99999,
                StartDate = now,
                EndDate = forever,
                IsActive = true,
                CreatedAt = now,
            },
            new Voucher
            {
                Id = 3,
                Code = "LUNAR2024",
                Description = "Giảm 500.000đ cho đơn từ 10.000.000đ",
                DiscountType = "Fixed",
                DiscountValue = 500000m,
                MinOrderValue = 10000000m,
                MaxDiscountValue = 500000m,
                MaxUses = 99999,
                MaxUsesPerUser = 1,
                StartDate = now,
                EndDate = forever,
                IsActive = true,
                CreatedAt = now,
            }
        );

        modelBuilder.Entity<OrderLog>()
            .HasOne(x => x.Order)
            .WithMany(x => x.OrderLogs)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Shipment>()
            .HasOne(x => x.Order)
            .WithMany(x => x.Shipments)
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Shipment>()
            .HasOne(x => x.ShippingProvider)
            .WithMany(x => x.Shipments)
            .HasForeignKey(x => x.ShippingProviderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ShipmentTrackingLog>()
            .HasOne(x => x.Shipment)
            .WithMany(x => x.ShipmentTrackingLogs)
            .HasForeignKey(x => x.ShipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Province>(e =>
        {
            e.HasKey(p => p.Code);
            e.Property(p => p.Code).HasMaxLength(2);
            e.Property(p => p.Name).HasMaxLength(100);
        });

        modelBuilder.Entity<District>(e =>
        {
            e.HasKey(d => d.Code);
            e.Property(d => d.Code).HasMaxLength(3);
            e.Property(d => d.Name).HasMaxLength(100);
            e.HasOne(d => d.Province)
                .WithMany(p => p.Districts)
                .HasForeignKey(d => d.ProvinceCode)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Ward>(e =>
        {
            e.HasKey(w => w.Code);
            e.Property(w => w.Code).HasMaxLength(5);
            e.Property(w => w.Name).HasMaxLength(100);
            e.HasOne(w => w.District)
                .WithMany(d => d.Wards)
                .HasForeignKey(w => w.DistrictCode)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ProductAssociationRule>()
            .HasOne(x => x.SourceProduct)
            .WithMany()
            .HasForeignKey(x => x.SourceProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProductAssociationRule>()
            .HasOne(x => x.RecommendedProduct)
            .WithMany()
            .HasForeignKey(x => x.RecommendedProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<ProductComboItem>()
            .HasOne(x => x.ProductCombo)
            .WithMany(c => c.Items)
            .HasForeignKey(x => x.ProductComboId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProductComboItem>()
            .HasOne(x => x.Product)
            .WithMany()
            .HasForeignKey(x => x.ProductId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Order>()
            .HasOne(o => o.AppliedCombo)
            .WithMany()
            .HasForeignKey(o => o.AppliedComboId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<Cart>()
            .HasOne(c => c.AppliedCombo)
            .WithMany()
            .HasForeignKey(c => c.AppliedComboId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
    }
    protected override void ConfigureConventions(ModelConfigurationBuilder configurationBuilder)
    {
        // Tự động set kiểu decimal(18,2) cho tất cả các thuộc tính dùng kiểu decimal trong toàn bộ hệ thống
        configurationBuilder.Properties<decimal>().HavePrecision(18, 2);
    }
}
