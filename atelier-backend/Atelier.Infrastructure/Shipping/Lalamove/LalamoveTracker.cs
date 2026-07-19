using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using Atelier.Application.Shipping.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Atelier.Infrastructure.Shipping.Lalamove;

public class LalamoveOrderDetailResponse
{
    [JsonPropertyName("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("driverId")]
    public string? DriverId { get; set; }

    [JsonPropertyName("shareLink")]
    public string? ShareLink { get; set; }

    [JsonPropertyName("createdAt")]
    public DateTime? CreatedAt { get; set; }

    [JsonPropertyName("updatedAt")]
    public DateTime? UpdatedAt { get; set; }

    [JsonPropertyName("scheduledAt")]
    public DateTime? ScheduledAt { get; set; }
}

public class LalamoveTracker : IShipmentTracker
{
    public string ProviderCode => "Lalamove";

    private readonly HttpClient _httpClient;
    private readonly LalamoveOptions _options;
    private readonly ILogger<LalamoveTracker> _logger;

    public LalamoveTracker(
        HttpClient httpClient,
        IOptions<LalamoveOptions> options,
        ILogger<LalamoveTracker> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<TrackingResult?> TrackAsync(string trackingCode, CancellationToken ct = default)
    {
        try
        {
            var path = $"/v3/orders/{trackingCode}";
            var token = LalamoveAuthHelper.BuildToken("GET", path, "", _options.PublicKey, _options.SecretKey);

            using var req = new HttpRequestMessage(HttpMethod.Get, $"{_options.BaseUrl.TrimEnd('/')}{path}");
            req.Headers.Add("Authorization", token);
            req.Headers.Add("Market", _options.Market);
            req.Headers.Add("Request-ID", Guid.NewGuid().ToString());

            var res = await _httpClient.SendAsync(req, ct);
            var body = await res.Content.ReadAsStringAsync(ct);

            if (!res.IsSuccessStatusCode)
            {
                _logger.LogWarning("Lalamove track order {TrackingCode} failed {Status}: {Body}", trackingCode, (int)res.StatusCode, body);
                return null;
            }

            using var doc = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonDocument>(body);
            if (doc == null) return null;

            var hasData = doc.RootElement.TryGetProperty("data", out var dataEl);
            var json = hasData ? dataEl.GetRawText() : body;

            var orderData = System.Text.Json.JsonSerializer.Deserialize<LalamoveOrderDetailResponse>(json);
            if (orderData == null) return null;

            _logger.LogDebug("Lalamove track {TrackingCode}: status={Status}, raw={Raw}", trackingCode, orderData.Status, body);

            var logs = new List<TrackingLogEntry>();

            // Use carrier timestamp if available: prefer updatedAt, then createdAt
            var carrierTimestamp = orderData.UpdatedAt ?? orderData.CreatedAt;
            var timestamp = carrierTimestamp ?? DateTime.UtcNow;

            var mappedStatus = MapStatus(orderData.Status);
            logs.Add(new TrackingLogEntry
            {
                Status = mappedStatus,
                Description = $"Lalamove: {MapStatusToVietnamese(orderData.Status)}",
                Timestamp = timestamp,
                CarrierTimestamp = carrierTimestamp,
            });

            return new TrackingResult
            {
                CarrierStatus = orderData.Status,
                CarrierMessage = null,
                Logs = logs,
                // Lalamove doesn't provide estimated delivery date yet
                EstimatedDeliveryDate = null,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Lalamove track error for {TrackingCode}: {Error}", trackingCode, ex.Message);
            return null;
        }
    }

    public static string MapStatus(string lalamoveStatus) => lalamoveStatus switch
    {
        "Assigning" or "ASSIGNING_DRIVER" => "Shipping",
        "On Going" or "ON_GOING" => "Shipping",
        "Picked Up" or "PICKED_UP" => "Shipped",
        "Completed" or "COMPLETED" or "COMPLETE" => "Delivered",
        "Expired" or "EXPIRED" => "Cancelled",
        "Cancelled" or "Canceled" or "CANCELED" => "Cancelled",
        "Rejected" or "REJECTED" => "Cancelled",
        _ => "Shipping",
    };

    public static string MapStatusToVietnamese(string lalamoveStatus) => lalamoveStatus switch
    {
        "Assigning" or "ASSIGNING_DRIVER" => "Đang tìm tài xế",
        "On Going" or "ON_GOING" => "Đang giao hàng",
        "Picked Up" or "PICKED_UP" => "Đã lấy hàng",
        "Completed" or "COMPLETED" or "COMPLETE" => "Hoàn thành",
        "Expired" or "EXPIRED" => "Hết hạn",
        "Cancelled" or "Canceled" or "CANCELED" => "Đã hủy",
        "Rejected" or "REJECTED" => "Bị từ chối",
        _ => lalamoveStatus,
    };
}