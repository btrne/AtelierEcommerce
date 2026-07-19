namespace Atelier.Application.Common.Interfaces;

public class AiChatRequest
{
    public int? UserId { get; set; }
    public string Message { get; set; } = null!;
    public List<AiChatHistoryItem>? History { get; set; }
}

public class AiChatHistoryItem
{
    public string Role { get; set; } = null!;
    public string Text { get; set; } = null!;
}

public class AiProductSuggestion
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public decimal PriceMin { get; set; }
    public decimal PriceMax { get; set; }
    public string? ImageUrl { get; set; }
    public string? Slug { get; set; }
    public string? CategoryName { get; set; }
}

public class AiChatResult
{
    public string Reply { get; set; } = null!;
    public int? ConversationId { get; set; }
    public string? TransferTo { get; set; }
    public string? TransferReason { get; set; }
    public List<AiProductSuggestion>? ProductSuggestions { get; set; }
}

public interface IAiService
{
    Task<AiChatResult> ChatAsync(AiChatRequest request, CancellationToken ct);
}
