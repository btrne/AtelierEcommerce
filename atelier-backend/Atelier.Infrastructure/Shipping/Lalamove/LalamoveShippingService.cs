using System.Linq;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using Atelier.Application.Common.Interfaces;
using Atelier.Application.Shipping.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Atelier.Infrastructure.Shipping.Lalamove;

public class LalamoveOrderResponse
{
    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("quotationId")]
    public string QuotationId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;
}

public class LalamoveShippingService : IShippingService
{
    public bool CanHandle(string providerCode) => providerCode == "Lalamove";
    private readonly IApplicationDbContext _context;
    private readonly HttpClient _httpClient;
    private readonly LalamoveOptions _options;
    private readonly ILogger<LalamoveShippingService> _logger;
    private readonly IGeocodingService _geocoding;

    public LalamoveShippingService(
        IApplicationDbContext context,
        HttpClient httpClient,
        IOptions<LalamoveOptions> options,
        ILogger<LalamoveShippingService> logger,
        IGeocodingService geocoding)
    {
        _context = context;
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
        _geocoding = geocoding;
    }

    public async Task<CreateShipmentResult> CreateShipmentAsync(int orderId, int providerId, decimal weight, CancellationToken ct = default)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order == null)
            return new CreateShipmentResult { IsSuccess = false, ErrorMessage = $"Không tìm thấy đơn hàng ID = {orderId}" };

        try
        {
            var customerAddress = $"{order.ShippingDetail}, {order.ShippingWard}, {order.ShippingDistrict}, {order.ShippingProvince}";
            var customerPoint = await _geocoding.GeocodeAsync(customerAddress, ct);

            var quotationJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                data = new
                {
                    serviceType = "MOTORCYCLE",
                    stops = new[]
                    {
                        new
                        {
                            coordinates = new { lat = _options.StoreLat.ToString("F6"), lng = _options.StoreLng.ToString("F6") },
                            address = _options.StoreAddress,
                        },
                        new
                        {
                            coordinates = new
                            {
                                lat = customerPoint?.Lat.ToString("F6") ?? "10.8231",
                                lng = customerPoint?.Lng.ToString("F6") ?? "106.6297",
                            },
                            address = customerAddress,
                        },
                    },
                    language = "vi_VN",
                }
            });

            // Step 1: Create quotation
            var quotePath = "/v3/quotations";
            var quoteToken = LalamoveAuthHelper.BuildToken("POST", quotePath, quotationJson, _options.PublicKey, _options.SecretKey);

            using var quoteReq = new HttpRequestMessage(HttpMethod.Post, $"{_options.BaseUrl.TrimEnd('/')}{quotePath}")
            {
                Content = new StringContent(quotationJson, Encoding.UTF8, "application/json"),
            };
            quoteReq.Headers.Add("Authorization", quoteToken);
            quoteReq.Headers.Add("Market", _options.Market);
            quoteReq.Headers.Add("Request-ID", Guid.NewGuid().ToString());

            var quoteRes = await _httpClient.SendAsync(quoteReq, ct);
            var quoteBody = await quoteRes.Content.ReadAsStringAsync(ct);

            if (!quoteRes.IsSuccessStatusCode)
                return new CreateShipmentResult { IsSuccess = false, ErrorMessage = $"Lalamove quotation thất bại: {quoteBody}" };

            var quoteDoc = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonDocument>(quoteBody);
            var quoteData = quoteDoc != null && quoteDoc.RootElement.TryGetProperty("data", out var qDataEl)
                ? System.Text.Json.JsonSerializer.Deserialize<LalamoveQuotationResponse>(qDataEl.GetRawText())
                : System.Text.Json.JsonSerializer.Deserialize<LalamoveQuotationResponse>(quoteBody);
            if (quoteData?.QuotationId == null)
                return new CreateShipmentResult { IsSuccess = false, ErrorMessage = "Lalamove không trả quotationId" };

            // Step 2: Create order using stopIds from quotation
            var senderStopId = quoteData.Stops?.Count > 0 ? quoteData.Stops[0].StopId : null;
            var recipientStopId = quoteData.Stops?.Count > 1 ? quoteData.Stops[1].StopId : null;
            if (string.IsNullOrEmpty(senderStopId) || string.IsNullOrEmpty(recipientStopId))
                return new CreateShipmentResult { IsSuccess = false, ErrorMessage = "Lalamove quotation không trả stopId" };

            var storePhone = FormatPhone(_options.StorePhone);
            var customerPhone = FormatPhone(order.ShippingPhone);

            var orderJson = System.Text.Json.JsonSerializer.Serialize(new
            {
                data = new
                {
                    quotationId = quoteData.QuotationId,
                    sender = new
                    {
                        stopId = senderStopId,
                        name = _options.StoreName,
                        phone = storePhone,
                    },
                    recipients = new[]
                    {
                        new
                        {
                            stopId = recipientStopId,
                            name = order.ShippingContactName,
                            phone = customerPhone,
                        },
                    },
                }
            });

            var orderPath = "/v3/orders";
            var orderToken = LalamoveAuthHelper.BuildToken("POST", orderPath, orderJson, _options.PublicKey, _options.SecretKey);

            using var orderReq = new HttpRequestMessage(HttpMethod.Post, $"{_options.BaseUrl.TrimEnd('/')}{orderPath}")
            {
                Content = new StringContent(orderJson, Encoding.UTF8, "application/json"),
            };
            orderReq.Headers.Add("Authorization", orderToken);
            orderReq.Headers.Add("Market", _options.Market);
            orderReq.Headers.Add("Request-ID", Guid.NewGuid().ToString());

            var orderRes = await _httpClient.SendAsync(orderReq, ct);
            var orderBody = await orderRes.Content.ReadAsStringAsync(ct);

            if (!orderRes.IsSuccessStatusCode)
                return new CreateShipmentResult { IsSuccess = false, ErrorMessage = $"Lalamove tạo đơn thất bại: {orderBody}" };

            var orderDoc = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonDocument>(orderBody);
            var orderData = orderDoc != null && orderDoc.RootElement.TryGetProperty("data", out var oDataEl)
                ? System.Text.Json.JsonSerializer.Deserialize<LalamoveOrderResponse>(oDataEl.GetRawText())
                : System.Text.Json.JsonSerializer.Deserialize<LalamoveOrderResponse>(orderBody);
            if (orderData?.OrderId == null)
                return new CreateShipmentResult { IsSuccess = false, ErrorMessage = "Lalamove không trả orderId" };

            return new CreateShipmentResult
            {
                TrackingCode = orderData.OrderId,
                TotalFee = decimal.TryParse(quoteData.PriceBreakdown?.Total ?? "0", out var f) ? f : 0,
                IsSuccess = true,
            };
        }
        catch (Exception ex)
        {
            return new CreateShipmentResult { IsSuccess = false, ErrorMessage = ex.Message };
        }
    }

    private static string FormatPhone(string phone)
    {
        if (string.IsNullOrWhiteSpace(phone)) return phone;
        var digits = new string(phone.Where(char.IsDigit).ToArray());
        if (digits.StartsWith("0")) return "+84" + digits[1..];
        if (digits.StartsWith("84") && digits.Length >= 10) return "+" + digits;
        return phone;
    }
}
