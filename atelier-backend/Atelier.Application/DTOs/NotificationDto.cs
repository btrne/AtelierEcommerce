namespace Atelier.Application.DTOs;

public class NotificationDto
{
    public string Id { get; set; } = null!;
    public string Type { get; set; } = null!;
    public string Title { get; set; } = null!;
    public string? Body { get; set; }
    public string ReferenceType { get; set; } = null!;
    public int ReferenceId { get; set; }
    public DateTime CreatedAt { get; set; }
}
