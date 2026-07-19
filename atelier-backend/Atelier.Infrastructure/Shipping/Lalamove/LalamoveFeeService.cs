using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json.Serialization;
using Atelier.Application.Shipping.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Atelier.Infrastructure.Shipping.Lalamove;

public class LalamoveQuotationRequest
{
    [JsonPropertyName("serviceType")]
    public string ServiceType { get; set; } = "MOTORCYCLE";

    [JsonPropertyName("stops")]
    public List<LalamoveStop> Stops { get; set; } = new();

    [JsonPropertyName("language")]
    public string Language { get; set; } = "vi_VN";
}

public class LalamoveStop
{
    [JsonPropertyName("coordinates")]
    public LalamoveCoordinates Coordinates { get; set; } = new();

    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("phone")]
    public string? Phone { get; set; }
}

public class LalamoveCoordinates
{
    [JsonPropertyName("lat")]
    public string Lat { get; set; } = string.Empty;

    [JsonPropertyName("lng")]
    public string Lng { get; set; } = string.Empty;
}

public class LalamoveQuotationStop
{
    [JsonPropertyName("stopId")]
    public string StopId { get; set; } = string.Empty;
}

public class LalamoveQuotationResponse
{
    [JsonPropertyName("quotationId")]
    public string QuotationId { get; set; } = string.Empty;

    [JsonPropertyName("stops")]
    public List<LalamoveQuotationStop> Stops { get; set; } = new();

    [JsonPropertyName("priceBreakdown")]
    public LalamovePriceBreakdown? PriceBreakdown { get; set; }

    [JsonPropertyName("distance")]
    public LalamoveDistance? Distance { get; set; }
}

public class LalamovePriceBreakdown
{
    [JsonPropertyName("total")]
    public string Total { get; set; } = "0";
}

public class LalamoveDistance
{
    [JsonPropertyName("value")]
    public string Value { get; set; } = "0";

    [JsonPropertyName("unit")]
    public string Unit { get; set; } = "m";
}

public class LalamoveFeeService : IShippingFeeService
{
    public string CarrierCode => "Lalamove";

    private readonly HttpClient _httpClient;
    private readonly LalamoveOptions _options;
    private readonly ILogger<LalamoveFeeService> _logger;
    private readonly IGeocodingService _geocoding;

    public LalamoveFeeService(
        HttpClient httpClient,
        IOptions<LalamoveOptions> options,
        ILogger<LalamoveFeeService> logger,
        IGeocodingService geocoding)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _geocoding = geocoding;
    }

    public async Task<ShippingFeeResult> CalculateFeeAsync(
        string province, string district, string ward, decimal weightInGram, string serviceType = "standard", CancellationToken ct = default)
    {
        try
        {
            var customerAddress = $"{ward}, {district}, {province}";
            var customerPoint = await _geocoding.GeocodeAsync(customerAddress, ct);
            if (customerPoint == null)
            {
                return new ShippingFeeResult
                {
                    IsSuccess = false,
                    Fee = 0,
                    ErrorMessage = "Không thể xác định toạ độ địa chỉ giao hàng",
                    CarrierCode = "Lalamove",
                    ServiceName = "Giao hàng nhanh",
                    Description = "1-2 giờ (nội thành)",
                };
            }

            var quotation = new LalamoveQuotationRequest
            {
                ServiceType = "MOTORCYCLE",
                Stops = new List<LalamoveStop>
                {
                    new()
                    {
                        Coordinates = new LalamoveCoordinates
                        {
                            Lat = _options.StoreLat.ToString("F6"),
                            Lng = _options.StoreLng.ToString("F6"),
                        },
                        Address = _options.StoreAddress,
                    },
                    new()
                    {
                        Coordinates = new LalamoveCoordinates
                        {
                            Lat = customerPoint.Lat.ToString("F6"),
                            Lng = customerPoint.Lng.ToString("F6"),
                        },
                        Address = customerAddress,
                    },
                },
                Language = "vi_VN",
            };

            var wrapped = new { data = quotation };
            var json = System.Text.Json.JsonSerializer.Serialize(wrapped);
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
            var path = "/v3/quotations";
            var rawSig = $"{timestamp}\r\nPOST\r\n{path}\r\n\r\n{json}";
            var signature = HmacSha256Hex(rawSig, _options.SecretKey);
            var token = $"hmac {_options.PublicKey}:{timestamp}:{signature}";

            using var req = new HttpRequestMessage(HttpMethod.Post, $"{_options.BaseUrl.TrimEnd('/')}{path}")
            {
                Content = new StringContent(json, Encoding.UTF8, "application/json"),
            };
            req.Headers.Add("Authorization", token);
            req.Headers.Add("Market", _options.Market);
            req.Headers.Add("Request-ID", Guid.NewGuid().ToString());

            var res = await _httpClient.SendAsync(req, ct);
            var body = await res.Content.ReadAsStringAsync(ct);

            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Lalamove quotation failed {Status}: {Body}", (int)res.StatusCode, body);
                return new ShippingFeeResult
                {
                    IsSuccess = false,
                    Fee = 50000,
                    ErrorMessage = $"Lalamove API lỗi: {body}",
                    CarrierCode = "Lalamove",
                    ServiceName = "Giao hàng nhanh",
                    Description = "1-2 giờ (nội thành)",
                };
            }

            var response = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonDocument>(body);
            var responseData = response != null && response.RootElement.TryGetProperty("data", out var dataEl)
                ? System.Text.Json.JsonSerializer.Deserialize<LalamoveQuotationResponse>(dataEl.GetRawText())
                : System.Text.Json.JsonSerializer.Deserialize<LalamoveQuotationResponse>(body);
            var totalStr = responseData?.PriceBreakdown?.Total ?? "0";
            var fee = decimal.TryParse(totalStr, out var parsed) ? parsed : 0;

            return new ShippingFeeResult
            {
                IsSuccess = true,
                Fee = fee,
                LeadTime = responseData?.Distance?.Value != null
                    ? (long)(double.Parse(responseData.Distance.Value) / 500 * 60)
                    : 3600,
                CarrierCode = "Lalamove",
                ServiceName = "Giao hàng nhanh",
                Description = "1-2 giờ (nội thành)",
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Lalamove fee calculation failed: {Error}", ex.Message);
            return new ShippingFeeResult
            {
                IsSuccess = false,
                Fee = 50000,
                ErrorMessage = ex.Message,
                CarrierCode = "Lalamove",
                ServiceName = "Giao hàng nhanh",
                Description = "1-2 giờ (nội thành)",
            };
        }
    }

    private static string HmacSha256Hex(string message, string secret)
    {
        var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
