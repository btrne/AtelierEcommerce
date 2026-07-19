namespace Atelier.Domain.Entities;

public class ProductAssociationRule
{
    public int Id { get; set; }
    public int SourceProductId { get; set; }
    public int RecommendedProductId { get; set; }
    public double Confidence { get; set; }
    public double Lift { get; set; }
    public DateTime UpdatedAt { get; set; }

    public virtual Product SourceProduct { get; set; } = null!;
    public virtual Product RecommendedProduct { get; set; } = null!;
}
