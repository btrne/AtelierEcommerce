namespace Atelier.Domain.Entities;

public class Collection
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string? BannerImageUrl { get; set; }
    public string? Description { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual ICollection<ProductCollection> ProductCollections { get; set; } = new List<ProductCollection>();
}
