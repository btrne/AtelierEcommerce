namespace Atelier.Domain.Entities;

public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public int ViewsCount { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPreorder { get; set; }
    public bool IsActive { get; set; }
    public string? Story { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual Category Category { get; set; } = null!;
    public virtual ICollection<ProductVariant> ProductVariants { get; set; } = new List<ProductVariant>();
    public virtual ICollection<ProductCollection> ProductCollections { get; set; } = new List<ProductCollection>();
    public virtual ICollection<Wishlist> Wishlists { get; set; } = new List<Wishlist>();
}
