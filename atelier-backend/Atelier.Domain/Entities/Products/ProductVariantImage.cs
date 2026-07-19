namespace Atelier.Domain.Entities;

public class ProductVariantImage
{
    public int Id { get; set; }
    public int ProductVariantId { get; set; }
    public string ImageUrl { get; set; } = null!;
    public bool? IsPrimary { get; set; }
    public virtual ProductVariant ProductVariant { get; set; } = null!;
}
