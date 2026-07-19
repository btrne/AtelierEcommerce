namespace Atelier.Application.Shipping.Services;

public class ShippingFeeResult
{
    public decimal Fee { get; set; }
    public long LeadTime { get; set; }
    public bool IsSuccess { get; set; }
    public string? ErrorMessage { get; set; }
    public string CarrierCode { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public interface IShippingFeeService
{
    string CarrierCode { get; }
    Task<ShippingFeeResult> CalculateFeeAsync(string province, string district, string ward, decimal weightInGram, string serviceType = "standard", CancellationToken ct = default);
}
