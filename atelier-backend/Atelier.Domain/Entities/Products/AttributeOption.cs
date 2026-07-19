namespace Atelier.Domain.Entities;

public class AttributeOption
{
    public int Id { get; set; }
    public int AttributeId { get; set; }
    public string Value { get; set; } = null!;
    public virtual ProductAttribute Attribute { get; set; } = null!;
    public virtual ICollection<VariantAttribute> VariantAttributes { get; set; } = new List<VariantAttribute>();
}
