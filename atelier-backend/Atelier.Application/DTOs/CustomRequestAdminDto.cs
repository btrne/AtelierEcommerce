namespace Atelier.Application.DTOs;

public class CustomRequestAdminDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? UserName { get; set; }
    public string? Description { get; set; }
    public decimal? QuotedPrice { get; set; }
    public DateTime? EstimatedFinishDate { get; set; }
    public string Status { get; set; } = string.Empty;
    public int? ConversationId { get; set; }
    public DateTime? CustomerConfirmedAt { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? FinishedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; }
}
