using Atelier.Application.Shipping.Services;
using Microsoft.Extensions.Logging;

namespace Atelier.Infrastructure.Shipping.GHN;

public class GhnTracker : IShipmentTracker
{
    public string ProviderCode => "GHN";

    private readonly GhnApiClient _apiClient;
    private readonly ILogger<GhnTracker> _logger;

    public GhnTracker(GhnApiClient apiClient, ILogger<GhnTracker> logger)
    {
        _apiClient = apiClient;
        _logger = logger;
    }

    public async Task<TrackingResult?> TrackAsync(string trackingCode, CancellationToken ct = default)
    {
        try
        {
            var detail = await _apiClient.GetOrderDetailAsync(trackingCode, ct);
            if (detail == null)
            {
                _logger.LogWarning("GHN order detail returned null for {TrackingCode}", trackingCode);
                return null;
            }

            _logger.LogInformation("GHN track: code={TrackingCode}, rawStatus={RawStatus}, mappedStatus={MappedStatus}", trackingCode, detail.Status, MapStatus(detail.Status));

            var mappedStatus = MapStatus(detail.Status);

            // Get carrier timestamp: prefer top-level updated_date, then last log entry, then UtcNow
            var carrierTimestamp = detail.UpdatedDate
                ?? detail.Log?.LastOrDefault()?.UpdatedDate
                ?? DateTime.UtcNow;

            var logs = new List<TrackingLogEntry>();

            // Build log entries from GHN log array if available
            if (detail.Log != null && detail.Log.Count > 0)
            {
                foreach (var logEntry in detail.Log)
                {
                    logs.Add(new TrackingLogEntry
                    {
                        Status = MapStatus(logEntry.Status),
                        Description = $"GHN: {MapStatusToVietnamese(logEntry.Status)}",
                        Timestamp = logEntry.UpdatedDate ?? DateTime.UtcNow,
                        CarrierTimestamp = logEntry.UpdatedDate,
                    });
                }
            }

            // Always add current status entry
            logs.Add(new TrackingLogEntry
            {
                Status = mappedStatus,
                Description = $"GHN: {MapStatusToVietnamese(detail.Status)}",
                Timestamp = carrierTimestamp,
                CarrierTimestamp = carrierTimestamp,
            });

            DateTime? estimatedDelivery = detail.ExpectedDeliveryTime;

            return new TrackingResult
            {
                CarrierStatus = detail.Status,
                CarrierMessage = null,
                Logs = logs,
                EstimatedDeliveryDate = estimatedDelivery,
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning("GHN track error for {TrackingCode}: {Error}", trackingCode, ex.Message);
            return null;
        }
    }

    public static string MapStatus(string ghnStatus) => ghnStatus switch
    {
        "ready_to_pick" or "picking" or "money_collect_picking" or "delivering" or "money_collect_delivering" or "delivery_fail" or "waiting_to_return" => "Shipping",
        "picked" or "storing" or "sorting" or "transporting" => "Shipped",
        "delivered" => "Delivered",
        "cancel" or "return" or "return_transporting" or "return_sorting" or "returning" or "return_fail" or "returned" => "Cancelled",
        _ => "Shipping",
    };

    public static string MapStatusToVietnamese(string ghnStatus) => ghnStatus switch
    {
        "ready_to_pick" => "Sẵn sàng lấy hàng",
        "picking" => "Đang lấy hàng",
        "cancel" => "Đã hủy",
        "money_collect_picking" => "Đang thu tiền khi lấy",
        "picked" => "Đã lấy hàng",
        "storing" => "Đang lưu kho",
        "sorting" => "Đang phân loại",
        "transporting" => "Đang vận chuyển",
        "delivering" => "Đang giao hàng",
        "money_collect_delivering" => "Đang thu tiền khi giao",
        "delivered" => "Giao thành công",
        "delivery_fail" => "Giao thất bại",
        "waiting_to_return" => "Chờ trả hàng",
        "return" => "Đang trả hàng",
        "return_transporting" => "Đang vận chuyển trả",
        "return_sorting" => "Đang phân loại trả",
        "returning" => "Đang trả lại",
        "return_fail" => "Trả thất bại",
        "returned" => "Đã trả hàng",
        _ => ghnStatus,
    };
}
