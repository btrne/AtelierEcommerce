namespace Atelier.Domain.Entities;

public class CustomRequest
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? Description { get; set; }
    public decimal? QuotedPrice { get; set; }
    public DateTime? EstimatedFinishDate { get; set; }
    public string Status { get; set; } = null!;
    public int? ConversationId { get; set; }
    public string? ImageUrl { get; set; }
    public DateTime? CustomerConfirmedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual Conversation? Conversation { get; set; }
}