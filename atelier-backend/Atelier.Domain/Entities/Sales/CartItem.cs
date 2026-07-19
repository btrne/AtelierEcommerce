namespace Atelier.Domain.Entities;

public class CartItem
{
    public int Id { get; set; }
    public int CartId { get; set; }
    public int ProductVariantId { get; set; }
    public int Quantity { get; set; }
    
    public virtual Cart Cart { get; set; } = null!;
    public virtual ProductVariant ProductVariant { get; set; } = null!;
}
