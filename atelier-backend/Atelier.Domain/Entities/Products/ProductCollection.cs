namespace Atelier.Domain.Entities;

public class ProductCollection
{
    public int ProductId { get; set; }
    public int CollectionId { get; set; }
    public virtual Product Product { get; set; } = null!;
    public virtual Collection Collection { get; set; } = null!;
}
