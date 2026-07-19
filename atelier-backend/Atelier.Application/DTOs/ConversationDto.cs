using Atelier.Application.Common.Interfaces;

namespace Atelier.Application.DTOs;

public class ConversationDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public string Type { get; set; } = "Support";
    public string? Title { get; set; }
    public string? LastMessage { get; set; }
    public int MessageCount { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? LastMessageAt { get; set; }
}

public class MessageDto
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string Sender { get; set; } = string.Empty;
    public string MessageText { get; set; } = string.Empty;
    public List<string> ImageUrls { get; set; } = new();
    public List<AiProductSuggestion> ProductSuggestions { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}
