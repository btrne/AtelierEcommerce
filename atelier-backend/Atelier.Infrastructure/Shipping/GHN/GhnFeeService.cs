using Atelier.Application.Shipping.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Atelier.Infrastructure.Shipping.GHN;

public class GhnFeeService : IShippingFeeService
{
    public string CarrierCode => "GHN";

    private readonly GhnApiClient _apiClient;
    private readonly GhnLocationCache _locationCache;
    private readonly IMemoryCache _cache;
    private readonly ILogger<GhnFeeService> _logger;
    private static readonly TimeSpan FeeCacheTtl = TimeSpan.FromMinutes(5);

    public GhnFeeService(GhnApiClient apiClient, GhnLocationCache locationCache, IMemoryCache cache, ILogger<GhnFeeService> logger)
    {
        _apiClient = apiClient;
        _locationCache = locationCache;
        _cache = cache;
        _logger = logger;
    }

    public async Task<ShippingFeeResult> CalculateFeeAsync(
        string province, string district, string ward, decimal weightInGram, string serviceType = "standard", CancellationToken ct = default)
    {
        var cacheKey = $"GHN_Fee_{province}_{district}_{ward}_{weightInGram}_{serviceType}";
        if (_cache.TryGetValue<ShippingFeeResult>(cacheKey, out var cached))
            return cached!;

        try
        {
            var (_, toDistrictId, toWardCode) = await _locationCache.ResolveAsync(province, district, ward, ct);

            var fromDistrictId = await GetFromDistrictIdAsync(ct);

            var weight = (int)Math.Max(100, weightInGram);
            var (serviceId, serviceTypeId) = await GetServiceIdsAsync(fromDistrictId, toDistrictId, serviceType, weight, ct);

            var feeRequest = new GhnFeeRequest
            {
                FromDistrictId = fromDistrictId,
                ToDistrictId = toDistrictId,
                Weight = weight,
                ServiceTypeId = serviceTypeId,
                ServiceId = serviceId,
                InsuranceValue = 0,
            };

            var (feeData, errorMessage) = await _apiClient.CalculateFeeAsync(feeRequest, ct);
            if (feeData == null)
                return CreateFallback(errorMessage ?? "GHN API không phản hồi, dùng phí mặc định");

            var result = new ShippingFeeResult
            {
                Fee = feeData.Total,
                LeadTime = feeData.LeadTime,
                IsSuccess = true,
                CarrierCode = "GHN",
                ServiceName = "Giao hàng tiêu chuẩn",
                Description = "3-5 ngày làm việc",
            };

            _cache.Set(cacheKey, result, FeeCacheTtl);
            return result;
        }
        catch (Exception ex)
        {
            return CreateFallback(ex.Message);
        }
    }

    private async Task<int> GetFromDistrictIdAsync(CancellationToken ct)
    {
        return await _locationCache.GetFromDistrictIdAsync();
    }

    private static readonly TimeSpan ServiceCacheTtl = TimeSpan.FromMinutes(5);

    private async Task<(int ServiceId, int ServiceTypeId)> GetServiceIdsAsync(int fromDistrictId, int toDistrictId, string serviceType, int weightInGram, CancellationToken ct)
    {
        var cacheKey = $"GHN_AvailServices_{fromDistrictId}_{toDistrictId}";
        if (!_cache.TryGetValue<List<GhnAvailableService>>(cacheKey, out var services))
        {
            services = await _apiClient.GetAvailableServicesAsync(fromDistrictId, toDistrictId, ct);
            _cache.Set(cacheKey, services, ServiceCacheTtl);
            if (services.Count > 0)
            {
                var names = string.Join(", ", services.Select(s => $"{s.ShortName}(service_id={s.ServiceId},type_id={s.ServiceTypeId})"));
                _logger.LogInformation("GHN available services for {From}=>{To}: {Services}", fromDistrictId, toDistrictId, names);
            }
            else
            {
                _logger.LogWarning("GHN available-services returned empty list for {From}=>{To}", fromDistrictId, toDistrictId);
            }
        }

        if (services == null || services.Count == 0)
            throw new Exception("Không có dịch vụ vận chuyển khả dụng cho tuyến đường này");

        GhnAvailableService selected;
        if (serviceType == "express" && services.Count > 1 && weightInGram >= 500)
        {
            selected = services.Last();
            _logger.LogInformation("Express: chọn {Name}(id={Id},type={Type})", selected.ShortName, selected.ServiceId, selected.ServiceTypeId);
        }
        else
        {
            selected = services.First();
            _logger.LogInformation("{Mode}: chọn {Name}(id={Id},type={Type})", serviceType == "express" ? "Express" : "Standard", selected.ShortName, selected.ServiceId, selected.ServiceTypeId);
        }

        return (selected.ServiceId, selected.ServiceTypeId);
    }

    private static ShippingFeeResult CreateFallback(string error)
    {
        return new ShippingFeeResult
        {
            Fee = 30000,
            LeadTime = 0,
            IsSuccess = false,
            ErrorMessage = error,
            CarrierCode = "GHN",
            ServiceName = "Giao hàng tiêu chuẩn",
            Description = "3-5 ngày làm việc",
        };
    }
}
