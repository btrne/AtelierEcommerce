using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Atelier.Application.Shipping.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Atelier.Infrastructure.Shipping.GHN;

public class GhnProvince
{
    [JsonPropertyName("ProvinceID")]
    public int ProvinceId { get; set; }

    [JsonPropertyName("ProvinceName")]
    public string ProvinceName { get; set; } = string.Empty;

    [JsonPropertyName("NameExtension")]
    public List<string> NameExtension { get; set; } = new();

    [JsonPropertyName("Status")]
    public int Status { get; set; }
}

public class GhnDistrict
{
    [JsonPropertyName("DistrictID")]
    public int DistrictId { get; set; }

    [JsonPropertyName("ProvinceID")]
    public int ProvinceId { get; set; }

    [JsonPropertyName("DistrictName")]
    public string DistrictName { get; set; } = string.Empty;

    [JsonPropertyName("NameExtension")]
    public List<string> NameExtension { get; set; } = new();

    [JsonPropertyName("Status")]
    public int Status { get; set; }

    [JsonPropertyName("SupportType")]
    public int SupportType { get; set; }
}

public class GhnWard
{
    [JsonPropertyName("WardCode")]
    public string WardCode { get; set; } = string.Empty;

    [JsonPropertyName("DistrictID")]
    public int DistrictId { get; set; }

    [JsonPropertyName("WardName")]
    public string WardName { get; set; } = string.Empty;

    [JsonPropertyName("NameExtension")]
    public List<string> NameExtension { get; set; } = new();

    [JsonPropertyName("Status")]
    public int Status { get; set; }

    [JsonPropertyName("SupportType")]
    public int SupportType { get; set; }
}

public class GhnFeeRequest
{
    [JsonPropertyName("from_district_id")]
    public int FromDistrictId { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("from_ward_code")]
    public string? FromWardCode { get; set; }

    [JsonPropertyName("to_district_id")]
    public int ToDistrictId { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("to_ward_code")]
    public string? ToWardCode { get; set; }

    [JsonPropertyName("weight")]
    public int Weight { get; set; }

    [JsonPropertyName("service_type_id")]
    public int ServiceTypeId { get; set; } = 2;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("service_id")]
    public int? ServiceId { get; set; }

    [JsonPropertyName("insurance_value")]
    public int InsuranceValue { get; set; }

    [JsonPropertyName("cod_failed_amount")]
    public int CodFailedAmount { get; set; }

    [JsonPropertyName("coupon")]
    public string? Coupon { get; set; }
}

public class GhnFeeData
{
    [JsonPropertyName("total")]
    public decimal Total { get; set; }

    [JsonPropertyName("service_fee")]
    public decimal ServiceFee { get; set; }

    [JsonPropertyName("insurance_fee")]
    public decimal InsuranceFee { get; set; }

    [JsonPropertyName("pick_station_fee")]
    public decimal PickStationFee { get; set; }

    [JsonPropertyName("coupon_value")]
    public decimal CouponValue { get; set; }

    [JsonPropertyName("r2s_fee")]
    public decimal R2sFee { get; set; }

    [JsonPropertyName("expected_delivery_time")]
    public long ExpectedDeliveryTime { get; set; }

    [JsonPropertyName("leadtime")]
    public long LeadTime { get; set; }
}

public class GhnOrderItem
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("quantity")]
    public int Quantity { get; set; }

    [JsonPropertyName("price")]
    public int Price { get; set; }

    [JsonPropertyName("weight")]
    public int Weight { get; set; }

    [JsonPropertyName("length")]
    public int Length { get; set; }

    [JsonPropertyName("width")]
    public int Width { get; set; }

    [JsonPropertyName("height")]
    public int Height { get; set; }
}

public class GhnCreateOrderRequest
{
    [JsonPropertyName("payment_type_id")]
    public int PaymentTypeId { get; set; } = 2;

    [JsonPropertyName("note")]
    public string? Note { get; set; }

    [JsonPropertyName("required_note")]
    public string RequiredNote { get; set; } = "CHOXEMHANGKHONGTHU";

    [JsonPropertyName("from_name")]
    public string? FromName { get; set; }

    [JsonPropertyName("from_phone")]
    public string FromPhone { get; set; } = string.Empty;

    [JsonPropertyName("from_address")]
    public string FromAddress { get; set; } = string.Empty;

    [JsonPropertyName("from_ward_code")]
    public string FromWardCode { get; set; } = string.Empty;

    [JsonPropertyName("from_district_id")]
    public int FromDistrictId { get; set; }

    [JsonPropertyName("to_name")]
    public string ToName { get; set; } = string.Empty;

    [JsonPropertyName("to_phone")]
    public string ToPhone { get; set; } = string.Empty;

    [JsonPropertyName("to_address")]
    public string ToAddress { get; set; } = string.Empty;

    [JsonPropertyName("to_ward_code")]
    public string ToWardCode { get; set; } = string.Empty;

    [JsonPropertyName("to_district_id")]
    public int ToDistrictId { get; set; }

    [JsonPropertyName("cod_amount")]
    public int CodAmount { get; set; }

    [JsonPropertyName("weight")]
    public int Weight { get; set; }

    [JsonPropertyName("length")]
    public int Length { get; set; } = 10;

    [JsonPropertyName("width")]
    public int Width { get; set; } = 10;

    [JsonPropertyName("height")]
    public int Height { get; set; } = 10;

    [JsonPropertyName("service_type_id")]
    public int ServiceTypeId { get; set; } = 2;

    [JsonPropertyName("service_id")]
    public int? ServiceId { get; set; }

    [JsonPropertyName("insurance_value")]
    public int InsuranceValue { get; set; }

    [JsonPropertyName("items")]
    public List<GhnOrderItem> Items { get; set; } = new();
}

public class GhnCreateOrderData
{
    [JsonPropertyName("order_code")]
    public string OrderCode { get; set; } = string.Empty;

    [JsonPropertyName("expected_delivery_time")]
    public DateTime? ExpectedDeliveryTime { get; set; }

    [JsonPropertyName("total_fee")]
    public decimal TotalFee { get; set; }
}

public class GhnOrderLog
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("updated_date")]
    public DateTime? UpdatedDate { get; set; }
}

public class GhnOrderDetailData
{
    [JsonPropertyName("order_code")]
    public string OrderCode { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("expected_delivery_time")]
    public DateTime? ExpectedDeliveryTime { get; set; }

    [JsonPropertyName("updated_date")]
    public DateTime? UpdatedDate { get; set; }

    [JsonPropertyName("log")]
    public List<GhnOrderLog>? Log { get; set; }
}

public class GhnApiResponse<T>
{
    [JsonPropertyName("code")]
    public int Code { get; set; }

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("data")]
    public T? Data { get; set; }
}

public class GhnAvailableService
{
    [JsonPropertyName("service_id")]
    public int ServiceId { get; set; }

    [JsonPropertyName("short_name")]
    public string ShortName { get; set; } = string.Empty;

    [JsonPropertyName("service_type_id")]
    public int ServiceTypeId { get; set; }
}

public class GhnApiClient
{
    private readonly HttpClient _httpClient;
    private readonly GhnOptions _options;
    private readonly ILogger<GhnApiClient> _logger;
    private readonly string _masterDataBase;

    public GhnApiClient(HttpClient httpClient, IOptions<GhnOptions> options, ILogger<GhnApiClient> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;

        var url = _options.BaseUrl.TrimEnd('/');
        _httpClient.BaseAddress = new Uri(url + "/");
        _masterDataBase = "https://online-gateway.ghn.vn/shiip/public-api/";
    }

    public async Task<List<GhnProvince>> GetProvincesAsync(CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Get, $"{_masterDataBase}master-data/province");
        req.Headers.Add("Token", _options.MasterDataToken);
        var res = await _httpClient.SendAsync(req, ct);
        var body = await res.Content.ReadFromJsonAsync<GhnApiResponse<List<GhnProvince>>>(cancellationToken: ct);
        return body?.Data ?? new List<GhnProvince>();
    }

    public async Task<List<GhnDistrict>> GetDistrictsAsync(int provinceId, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{_masterDataBase}master-data/district")
        {
            Content = JsonContent.Create(new { province_id = provinceId }),
        };
        req.Headers.Add("Token", _options.MasterDataToken);
        var res = await _httpClient.SendAsync(req, ct);
        var body = await res.Content.ReadFromJsonAsync<GhnApiResponse<List<GhnDistrict>>>(cancellationToken: ct);
        return body?.Data ?? new List<GhnDistrict>();
    }

    public async Task<List<GhnWard>> GetWardsAsync(int districtId, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, $"{_masterDataBase}master-data/ward")
        {
            Content = JsonContent.Create(new { district_id = districtId }),
        };
        req.Headers.Add("Token", _options.MasterDataToken);
        var res = await _httpClient.SendAsync(req, ct);
        var body = await res.Content.ReadFromJsonAsync<GhnApiResponse<List<GhnWard>>>(cancellationToken: ct);
        return body?.Data ?? new List<GhnWard>();
    }

    public async Task<(GhnFeeData? Data, string? ErrorMessage)> CalculateFeeAsync(GhnFeeRequest request, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "shipping-order/fee")
        {
            Content = JsonContent.Create(request),
        };
        req.Headers.Add("Token", _options.Token);
        req.Headers.Add("ShopId", _options.ShopId.ToString());
        var res = await _httpClient.SendAsync(req, ct);
        if (!res.IsSuccessStatusCode)
        {
            var rawBody = await res.Content.ReadAsStringAsync(ct);
            _logger.LogWarning("GHN fee API returned {StatusCode}: {Body}", (int)res.StatusCode, rawBody);
        }
        var body = await res.Content.ReadFromJsonAsync<GhnApiResponse<GhnFeeData>>(cancellationToken: ct);
        if (body == null)
            return (null, "GHN không phản hồi");
        if (body.Code != 200 || body.Data == null)
            return (null, body.Message);
        return (body.Data, null);
    }

    private static readonly JsonSerializerOptions _ghnJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        NumberHandling = JsonNumberHandling.AllowReadingFromString,
    };

    public async Task<(GhnCreateOrderData? Data, string? ErrorMessage)> CreateOrderAsync(GhnCreateOrderRequest request, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "shipping-order/create")
        {
            Content = JsonContent.Create(request),
        };
        req.Headers.Add("Token", _options.Token);
        req.Headers.Add("ShopId", _options.ShopId.ToString());
        var res = await _httpClient.SendAsync(req, ct);
        var rawBody = await res.Content.ReadAsStringAsync(ct);
        if (!res.IsSuccessStatusCode)
        {
            _logger.LogWarning("GHN create order API returned {StatusCode}: {Body}", (int)res.StatusCode, rawBody);
        }
        GhnApiResponse<GhnCreateOrderData>? body;
        try
        {
            body = JsonSerializer.Deserialize<GhnApiResponse<GhnCreateOrderData>>(rawBody, _ghnJsonOptions);
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse GHN create order response: {Body}", rawBody);
            return (null, "Phản hồi từ GHN không hợp lệ");
        }
        if (body == null)
            return (null, "GHN không phản hồi");
        if (body.Code != 200 || body.Data == null)
            return (null, body.Message);
        return (body.Data, null);
    }

    public async Task<List<GhnAvailableService>> GetAvailableServicesAsync(int fromDistrict, int toDistrict, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "shipping-order/available-services")
        {
            Content = JsonContent.Create(new
            {
                shop_id = _options.ShopId,
                from_district = fromDistrict,
                to_district = toDistrict,
            }),
        };
        req.Headers.Add("Token", _options.Token);
        req.Headers.Add("ShopId", _options.ShopId.ToString());
        var res = await _httpClient.SendAsync(req, ct);
        var body = await res.Content.ReadFromJsonAsync<GhnApiResponse<List<GhnAvailableService>>>(cancellationToken: ct);
        return body?.Data ?? new List<GhnAvailableService>();
    }

    public async Task<GhnOrderDetailData?> GetOrderDetailAsync(string orderCode, CancellationToken ct = default)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, "shipping-order/detail")
        {
            Content = JsonContent.Create(new { order_code = orderCode }),
        };
        req.Headers.Add("Token", _options.Token);
        req.Headers.Add("ShopId", _options.ShopId.ToString());
        var res = await _httpClient.SendAsync(req, ct);
        var rawBody = await res.Content.ReadAsStringAsync(ct);
        _logger.LogInformation("GHN order detail API response ({StatusCode}): {Body}", (int)res.StatusCode, rawBody);
        try
        {
            var body = JsonSerializer.Deserialize<GhnApiResponse<GhnOrderDetailData>>(rawBody, _ghnJsonOptions);
            if (body?.Data != null)
                _logger.LogInformation("GHN order detail parsed: status={Status}, order_code={OrderCode}", body.Data.Status, body.Data.OrderCode);
            return body?.Data;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse GHN order detail response: {Body}", rawBody);
            return null;
        }
    }
}
