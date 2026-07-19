using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Atelier.Application.Shipping.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Atelier.Infrastructure.Shipping.Common;

public class NominatimGeocodingService : IGeocodingService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<NominatimGeocodingService> _logger;
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);
    private static readonly TimeSpan RateLimit = TimeSpan.FromSeconds(1);
    private static DateTime _lastRequest = DateTime.MinValue;

    public NominatimGeocodingService(HttpClient httpClient, IMemoryCache cache, ILogger<NominatimGeocodingService> logger)
    {
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;
    }

    private static readonly Dictionary<string, GeoPoint> DistrictFallback = new(StringComparer.OrdinalIgnoreCase)
    {
        { "Hóc Môn", new GeoPoint { Lat = 10.8780, Lng = 106.5950 } },
        { "Củ Chi", new GeoPoint { Lat = 10.9650, Lng = 106.5100 } },
        { "Quận 1", new GeoPoint { Lat = 10.7769, Lng = 106.7009 } },
        { "Quận 2", new GeoPoint { Lat = 10.7910, Lng = 106.7490 } },
        { "Quận 3", new GeoPoint { Lat = 10.7790, Lng = 106.6870 } },
        { "Quận 4", new GeoPoint { Lat = 10.7610, Lng = 106.7020 } },
        { "Quận 5", new GeoPoint { Lat = 10.7550, Lng = 106.6650 } },
        { "Quận 6", new GeoPoint { Lat = 10.7460, Lng = 106.6350 } },
        { "Quận 7", new GeoPoint { Lat = 10.7380, Lng = 106.7280 } },
        { "Quận 8", new GeoPoint { Lat = 10.7210, Lng = 106.6620 } },
        { "Quận 9", new GeoPoint { Lat = 10.8360, Lng = 106.7700 } },
        { "Quận 10", new GeoPoint { Lat = 10.7720, Lng = 106.6670 } },
        { "Quận 11", new GeoPoint { Lat = 10.7620, Lng = 106.6420 } },
        { "Quận 12", new GeoPoint { Lat = 10.8600, Lng = 106.6480 } },
        { "Bình Tân", new GeoPoint { Lat = 10.7680, Lng = 106.6050 } },
        { "Bình Thạnh", new GeoPoint { Lat = 10.8020, Lng = 106.7030 } },
        { "Gò Vấp", new GeoPoint { Lat = 10.8310, Lng = 106.6730 } },
        { "Phú Nhuận", new GeoPoint { Lat = 10.7960, Lng = 106.6860 } },
        { "Tân Bình", new GeoPoint { Lat = 10.7920, Lng = 106.6560 } },
        { "Tân Phú", new GeoPoint { Lat = 10.7850, Lng = 106.6260 } },
        { "Thủ Đức", new GeoPoint { Lat = 10.8510, Lng = 106.7620 } },
        { "Nhà Bè", new GeoPoint { Lat = 10.6930, Lng = 106.7240 } },
        { "Bình Chánh", new GeoPoint { Lat = 10.6820, Lng = 106.5930 } },
        { "Cần Giờ", new GeoPoint { Lat = 10.4700, Lng = 106.8500 } },
    };

    public async Task<GeoPoint?> GeocodeAsync(string address, CancellationToken ct = default)
    {
        var cacheKey = $"Geo_{address}";
        if (_cache.TryGetValue<GeoPoint?>(cacheKey, out var cached))
            return cached;

        try
        {
            var elapsed = DateTime.UtcNow - _lastRequest;
            if (elapsed < RateLimit)
                await Task.Delay(RateLimit - elapsed, ct);

            _lastRequest = DateTime.UtcNow;

            var searchAddress = address.Contains("Việt Nam", StringComparison.OrdinalIgnoreCase) ? address : $"{address}, Việt Nam";

            // Strip administrative prefixes for better Nominatim matching
            var simplified = string.Join(", ", searchAddress
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(part =>
                {
                    var trimmed = part.Trim();
                    foreach (var prefix in new[] { "Thị trấn ", "Xã ", "Phường ", "Thị xã ", "Thành phố ", "Huyện ", "Quận ", "Thị trấn" })
                    {
                        if (trimmed.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                            return trimmed[prefix.Length..].Trim();
                    }
                    return trimmed;
                })
                .Where(p => !string.IsNullOrEmpty(p))
                .Distinct());

            var url = $"https://nominatim.openstreetmap.org/search?q={Uri.EscapeDataString(simplified)}&format=json&limit=1";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("User-Agent", "AtelierShop/1.0");
            var res = await _httpClient.SendAsync(req, ct);
            var results = await res.Content.ReadFromJsonAsync<List<NominatimResult>>(cancellationToken: ct);

            if (results != null && results.Count > 0)
            {
                var point = new GeoPoint
                {
                    Lat = double.Parse(results[0].Lat),
                    Lng = double.Parse(results[0].Lon),
                };
                _cache.Set(cacheKey, point, CacheTtl);
                return point;
            }

            // Fallback: try district-level mapping
            foreach (var kvp in DistrictFallback)
            {
                if (address.Contains(kvp.Key, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogInformation("Nominatim fallback to district {District} for {Address}", kvp.Key, address);
                    _cache.Set(cacheKey, kvp.Value, CacheTtl);
                    return kvp.Value;
                }
            }

            _logger.LogWarning("Nominatim no results for {Address}", address);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Nominatim geocode failed for {Address}: {Error}", address, ex.Message);
            return null;
        }
    }

    private class NominatimResult
    {
        [JsonPropertyName("lat")]
        public string Lat { get; set; } = string.Empty;

        [JsonPropertyName("lon")]
        public string Lon { get; set; } = string.Empty;

        [JsonPropertyName("display_name")]
        public string DisplayName { get; set; } = string.Empty;
    }
}
