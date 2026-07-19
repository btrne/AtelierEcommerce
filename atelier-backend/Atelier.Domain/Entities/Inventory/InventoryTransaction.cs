namespace Atelier.Domain.Entities;

public class InventoryTransaction
{
    public int Id { get; set; }
    public int ProductVariantId { get; set; }
    public string TransactionType { get; set; } = null!;
    public int Quantity { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual ProductVariant ProductVariant { get; set; } = null!;
}
