namespace Atelier.Domain.Entities;

public class VariantAttribute
{
    public int ProductVariantId { get; set; }
    public int AttributeOptionId { get; set; }
    public virtual ProductVariant ProductVariant { get; set; } = null!;
    public virtual AttributeOption AttributeOption { get; set; } = null!;
}
