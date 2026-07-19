namespace Atelier.Application.Shipping.Services;

public class TrackingLogEntry
{
    public string Status { get; set; } = string.Empty;
    public string? Description { get; set; }
    public DateTime Timestamp { get; set; }
    public DateTime? CarrierTimestamp { get; set; }
}

public class TrackingResult
{
    public string CarrierStatus { get; set; } = string.Empty;
    public string? CarrierMessage { get; set; }
    public List<TrackingLogEntry> Logs { get; set; } = new();
    public DateTime? EstimatedDeliveryDate { get; set; }
}

public interface IShipmentTracker
{
    string ProviderCode { get; }
    Task<TrackingResult?> TrackAsync(string trackingCode, CancellationToken ct = default);
}
