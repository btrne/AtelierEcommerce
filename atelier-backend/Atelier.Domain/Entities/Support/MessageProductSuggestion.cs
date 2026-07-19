namespace Atelier.Domain.Entities;

public class MessageProductSuggestion
{
    public int Id { get; set; }
    public int MessageId { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = "";
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public decimal PriceMin { get; set; }
    public decimal PriceMax { get; set; }
    public string? ImageUrl { get; set; }
    public string? Slug { get; set; }
    public string? CategoryName { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual Message Message { get; set; } = null!;
}
