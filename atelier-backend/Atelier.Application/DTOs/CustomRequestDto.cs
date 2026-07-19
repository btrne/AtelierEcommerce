namespace Atelier.Application.DTOs;

public class CustomRequestDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string? Description { get; set; }
    public string? ImageUrl { get; set; }
    public decimal? QuotedPrice { get; set; }
    public DateTime? EstimatedFinishDate { get; set; }
    public string Status { get; set; } = "";
    public DateTime? CustomerConfirmedAt { get; set; }
    public int? ConversationId { get; set; }
    public DateTime CreatedAt { get; set; }
}
