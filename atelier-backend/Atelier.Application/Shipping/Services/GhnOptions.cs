namespace Atelier.Application.Shipping.Services;

public class GhnOptions
{
    public string BaseUrl { get; set; } = "https://dev-online-gateway.ghn.vn/shiip/public-api/v2";
    public string Token { get; set; } = string.Empty;
    public string MasterDataToken { get; set; } = string.Empty;
    public int ShopId { get; set; }
    public string FromPhone { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string FromWardCode { get; set; } = string.Empty;
    public int FromDistrictId { get; set; }
}
