namespace Atelier.Domain.Entities;

public class ProductComboItem
{
    public int Id { get; set; }
    public int ProductComboId { get; set; }
    public int ProductId { get; set; }

    public virtual ProductCombo ProductCombo { get; set; } = null!;
    public virtual Product Product { get; set; } = null!;
}
