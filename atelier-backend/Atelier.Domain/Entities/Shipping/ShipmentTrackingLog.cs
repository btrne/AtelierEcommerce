namespace Atelier.Domain.Entities;

public class ShipmentTrackingLog
{
    public int Id { get; set; }
    public int ShipmentId { get; set; }
    public string Status { get; set; } = null!;
    public string? Description { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual Shipment Shipment { get; set; } = null!;
}
