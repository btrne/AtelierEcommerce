namespace Atelier.Application.DTOs;

public class ProductDetailDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? Story { get; set; }
    public decimal RatingAverage { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int? CollectionId { get; set; }
    public string? CollectionName { get; set; }
    public string? CollectionSlug { get; set; }
    
    // Danh sách các biến thể (Màu sắc, Size...) của sản phẩm này
    public List<VariantDto> Variants { get; set; } = new();
}

public class VariantDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public decimal? Weight { get; set; }
    public int StockQuantity { get; set; }
    public string? ThumbnailUrl { get; set; }
    public List<string> Images { get; set; } = new();
    public List<VariantAttributeDto> Attributes { get; set; } = new();
}