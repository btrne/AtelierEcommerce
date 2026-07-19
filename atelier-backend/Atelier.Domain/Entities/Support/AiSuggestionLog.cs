namespace Atelier.Domain.Entities;

public class AiSuggestionLog
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string UserQuery { get; set; } = null!;
    public string? AiMessage { get; set; }
    public int ProductId { get; set; }
    public string ProductName { get; set; } = null!;
    public decimal ProductPrice { get; set; }
    public string? ProductImage { get; set; }
    public string? ProductSlug { get; set; }
    public string? CategoryName { get; set; }
    public DateTime SuggestedAt { get; set; }

    public virtual User? User { get; set; }
}
