namespace Atelier.Application.DTOs;

public class ProductAdminDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? ShortDescription { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public decimal MinPrice { get; set; }
    public int TotalStock { get; set; }
    public int VariantCount { get; set; }
    public string? ThumbnailUrl { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPreorder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class ProductDetailAdminDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public string? Story { get; set; }
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public bool IsFeatured { get; set; }
    public bool IsPreorder { get; set; }
    public bool IsActive { get; set; }
    public int ViewsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<int> CollectionIds { get; set; } = new();
    public List<string> CollectionNames { get; set; } = new();
    public List<ProductVariantAdminDto> Variants { get; set; } = new();
}

public class ProductVariantImageDto
{
    public int Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
}

public class ProductVariantAdminDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public decimal? Weight { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public string? ThumbnailUrl { get; set; }
    public List<ProductVariantImageDto> Images { get; set; } = new();
    public List<VariantAttributeDto> Attributes { get; set; } = new();
}

public class VariantAttributeDto
{
    public int AttributeId { get; set; }
    public string AttributeName { get; set; } = string.Empty;
    public int OptionId { get; set; }
    public string OptionValue { get; set; } = string.Empty;
}
