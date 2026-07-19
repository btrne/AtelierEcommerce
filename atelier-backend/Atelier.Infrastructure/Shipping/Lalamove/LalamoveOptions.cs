namespace Atelier.Infrastructure.Shipping.Lalamove;

public class LalamoveOptions
{
    public string PublicKey { get; set; } = string.Empty;
    public string SecretKey { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://rest.sandbox.lalamove.com";
    public string Market { get; set; } = "VN";
    public double StoreLat { get; set; }
    public double StoreLng { get; set; }
    public string StoreAddress { get; set; } = string.Empty;
    public string StorePhone { get; set; } = string.Empty;
    public string StoreName { get; set; } = "Atelier Shop";
}
