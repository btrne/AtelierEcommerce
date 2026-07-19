namespace Atelier.Application.DTOs;

public class ProductDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ShortDescription { get; set; }
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string? ThumbnailUrl { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPreorder { get; set; }
    public bool IsInStock { get; set; }
    public int TotalSold { get; set; }
    public int ViewsCount { get; set; }
    public decimal RatingAverage { get; set; }
    public List<string> CollectionNames { get; set; } = new();
    public List<int> CollectionIds { get; set; } = new();
}
