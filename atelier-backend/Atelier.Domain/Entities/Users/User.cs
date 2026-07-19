namespace Atelier.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string? Provider { get; set; }
    public string? ProviderId { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public virtual ICollection<UserAddress> UserAddresses { get; set; } = new List<UserAddress>();
    public virtual ICollection<CustomRequest> CustomRequests { get; set; } = new List<CustomRequest>();
    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();
    public virtual ICollection<VoucherUsage> VoucherUsages { get; set; } = new List<VoucherUsage>();
    public virtual ICollection<Rating> Ratings { get; set; } = new List<Rating>();
    public virtual ICollection<Conversation> Conversations { get; set; } = new List<Conversation>();
    public virtual Cart? Cart { get; set; }
    public virtual ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
}
