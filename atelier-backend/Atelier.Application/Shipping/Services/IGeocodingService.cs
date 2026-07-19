namespace Atelier.Application.Shipping.Services;

public class GeoPoint
{
    public double Lat { get; set; }
    public double Lng { get; set; }
}

public interface IGeocodingService
{
    Task<GeoPoint?> GeocodeAsync(string address, CancellationToken ct = default);
}
