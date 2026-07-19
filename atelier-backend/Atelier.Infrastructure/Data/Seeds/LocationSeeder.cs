using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using Microsoft.Extensions.Logging;

namespace Atelier.Infrastructure.Data.Seeds;

public class LocationSeeder
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<LocationSeeder> _logger;

    public LocationSeeder(IApplicationDbContext context, ILogger<LocationSeeder> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await _context.Provinces.AnyAsync(ct))
        {
            _logger.LogInformation("Location data already seeded.");
            return;
        }

        var jsonPath = Path.Combine(AppContext.BaseDirectory, "Data", "Seeds", "vn_locations.json");
        if (!File.Exists(jsonPath))
        {
            _logger.LogWarning("Seed file not found: {Path}", jsonPath);
            return;
        }

        var json = await File.ReadAllTextAsync(jsonPath, ct);
        var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
        var data = JsonSerializer.Deserialize<LocationData>(json, options);
        if (data?.Provinces == null) return;

        _context.Provinces.AddRange(data.Provinces);
        if (data.Districts != null) _context.Districts.AddRange(data.Districts);
        if (data.Wards != null) _context.Wards.AddRange(data.Wards);

        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Seeded {ProvinceCount} provinces, {DistrictCount} districts, {WardCount} wards.",
            data.Provinces.Count, data.Districts?.Count ?? 0, data.Wards?.Count ?? 0);
    }

    private class LocationData
    {
        public List<Province>? Provinces { get; set; }
        public List<District>? Districts { get; set; }
        public List<Ward>? Wards { get; set; }
    }
}
