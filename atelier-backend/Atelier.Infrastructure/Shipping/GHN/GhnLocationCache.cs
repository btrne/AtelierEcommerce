using Microsoft.Extensions.Caching.Memory;

namespace Atelier.Infrastructure.Shipping.GHN;

public class GhnLocationCache
{
    private readonly GhnApiClient _apiClient;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan LocationCacheTtl = TimeSpan.FromHours(24);

    public GhnLocationCache(GhnApiClient apiClient, IMemoryCache cache)
    {
        _apiClient = apiClient;
        _cache = cache;
    }

    public async Task<(int ProvinceId, int DistrictId, string WardCode)> ResolveAsync(
        string provinceName, string districtName, string wardName, CancellationToken ct = default)
    {
        var provinces = await GetProvincesAsync(ct);
        var normalizedProvince = NormalizeName(provinceName);

        var province = provinces.FirstOrDefault(p =>
            NormalizeName(p.ProvinceName).Equals(normalizedProvince, StringComparison.OrdinalIgnoreCase) ||
            p.NameExtension.Any(ext => NormalizeName(ext).Equals(normalizedProvince, StringComparison.OrdinalIgnoreCase)));

        if (province == null)
            throw new Exception($"Không tìm thấy tỉnh/thành phố: {provinceName}");

        var districts = await GetDistrictsAsync(province.ProvinceId, ct);
        var normalizedDistrict = NormalizeName(districtName);

        var district = districts.FirstOrDefault(d =>
            NormalizeName(d.DistrictName).Equals(normalizedDistrict, StringComparison.OrdinalIgnoreCase) ||
            d.NameExtension.Any(ext => NormalizeName(ext).Equals(normalizedDistrict, StringComparison.OrdinalIgnoreCase)));

        if (district == null)
            throw new Exception($"Không tìm thấy quận/huyện: {districtName}");

        var wardCode = "";
        try
        {
            var wards = await GetWardsAsync(district.DistrictId, ct);
            var normalizedWard = NormalizeName(wardName);
            var ward = wards.FirstOrDefault(w =>
                NormalizeName(w.WardName).Equals(normalizedWard, StringComparison.OrdinalIgnoreCase) ||
                w.NameExtension.Any(ext => NormalizeName(ext).Equals(normalizedWard, StringComparison.OrdinalIgnoreCase)));
            if (ward != null)
                wardCode = ward.WardCode;
            else if (wards.Count > 0)
                wardCode = wards[0].WardCode;
        }
        catch
        {
            // Ward lookup failure is non-critical
        }

        return (province.ProvinceId, district.DistrictId, wardCode);
    }

    private async Task<List<GhnProvince>> GetProvincesAsync(CancellationToken ct)
    {
        const string cacheKey = "GHN_Provinces";
        if (_cache.TryGetValue<List<GhnProvince>>(cacheKey, out var cached))
            return cached!;

        var provinces = await _apiClient.GetProvincesAsync(ct);
        _cache.Set(cacheKey, provinces, LocationCacheTtl);
        return provinces;
    }

    private async Task<List<GhnDistrict>> GetDistrictsAsync(int provinceId, CancellationToken ct)
    {
        var cacheKey = $"GHN_Province_{provinceId}_Districts";
        if (_cache.TryGetValue<List<GhnDistrict>>(cacheKey, out var cached))
            return cached!;

        var districts = await _apiClient.GetDistrictsAsync(provinceId, ct);
        _cache.Set(cacheKey, districts, LocationCacheTtl);
        return districts;
    }

    private async Task<List<GhnWard>> GetWardsAsync(int districtId, CancellationToken ct)
    {
        var cacheKey = $"GHN_District_{districtId}_Wards";
        if (_cache.TryGetValue<List<GhnWard>>(cacheKey, out var cached))
            return cached!;

        var wards = await _apiClient.GetWardsAsync(districtId, ct);
        _cache.Set(cacheKey, wards, LocationCacheTtl);
        return wards;
    }

    private static string NormalizeName(string name)
    {
        var normalized = name.Trim();
        var prefixes = new[] { "Tỉnh ", "Thành phố ", "TP. ", "TP ", "Quận ", "Q. ", "Q ", "Huyện ", "H. ", "H ", "Phường ", "P. ", "P ", "Xã ", "X. ", "X ", "Thị trấn ", "Thị xã " };
        foreach (var prefix in prefixes)
        {
            if (normalized.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                normalized = normalized.Substring(prefix.Length);
                break;
            }
        }
        return normalized.Trim();
    }

    public Task<int> GetFromDistrictIdAsync()
    {
        return Task.FromResult(1460); // Củ Chi
    }
}
