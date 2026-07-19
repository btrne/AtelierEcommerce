namespace Atelier.Domain.Entities;

public class Shipment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int ShippingProviderId { get; set; }
    public string? TrackingCode { get; set; }
    public decimal ShippingFee { get; set; }
    public string Status { get; set; } = null!;
    public int DeliveryAttemptCount { get; set; }
    public DateTime? EstimatedDeliveryDate { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual Order Order { get; set; } = null!;
    public virtual ShippingProvider ShippingProvider { get; set; } = null!;
    public virtual ICollection<ShipmentTrackingLog> ShipmentTrackingLogs { get; set; } = new List<ShipmentTrackingLog>();
}
