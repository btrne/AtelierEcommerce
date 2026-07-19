namespace Atelier.Application.DTOs;

public class ShipmentTrackingLogDto
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }
}
