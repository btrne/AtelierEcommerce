namespace Atelier.Domain.Entities;

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int? ProductVariantId { get; set; }
    public string ProductNameSnapshot { get; set; } = null!;
    public string VariantSnapshot { get; set; } = null!;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual Order Order { get; set; } = null!;
    public virtual ProductVariant? ProductVariant { get; set; }
    public virtual Rating? Rating { get; set; }
}
