namespace Atelier.Application.DTOs;

public class ShipmentDto
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string? OrderCode { get; set; }
    public int ShippingProviderId { get; set; }
    public string? ShippingProviderName { get; set; }
    public string? TrackingCode { get; set; }
    public decimal ShippingFee { get; set; }
    public string Status { get; set; } = string.Empty;
    public int DeliveryAttemptCount { get; set; }
    public DateTime? EstimatedDeliveryDate { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<ShipmentTrackingLogDto> TrackingLogs { get; set; } = new();
}
