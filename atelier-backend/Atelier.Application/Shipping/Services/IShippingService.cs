namespace Atelier.Application.Shipping.Services;

public class CreateShipmentResult
{
    public string TrackingCode { get; set; } = string.Empty;
    public decimal TotalFee { get; set; }
    public DateTime? ExpectedDeliveryDate { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
}

public interface IShippingService
{
    bool CanHandle(string providerCode);
    Task<CreateShipmentResult> CreateShipmentAsync(int orderId, int providerId, decimal weight, CancellationToken ct = default);
}
