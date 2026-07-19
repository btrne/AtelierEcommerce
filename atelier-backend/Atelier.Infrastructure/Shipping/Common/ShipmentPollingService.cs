using Atelier.Application.Common.Interfaces;
using Atelier.Application.Shipping.Services;
using Atelier.Infrastructure.Shipping.GHN;
using Atelier.Infrastructure.Shipping.Lalamove;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Atelier.Infrastructure.Shipping.Common;

public class ShipmentPollingService : Microsoft.Extensions.Hosting.BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IOptions<ShipmentPollingOptions> _options;
    private readonly ILogger<ShipmentPollingService> _logger;

    public ShipmentPollingService(
        IServiceProvider serviceProvider,
        IOptions<ShipmentPollingOptions> options,
        ILogger<ShipmentPollingService> logger)
    {
        _serviceProvider = serviceProvider;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ShipmentPollingService started (interval: {Interval}s)", _options.Value.IntervalSeconds);

        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(_options.Value.IntervalSeconds));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await PollShipmentsAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogError(ex, "Shipment polling cycle failed");
            }
        }
    }

    private async Task PollShipmentsAsync(CancellationToken ct)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var statusService = scope.ServiceProvider.GetRequiredService<ShipmentStatusService>();
        var trackers = scope.ServiceProvider.GetRequiredService<IEnumerable<IShipmentTracker>>();
        var trackerMap = trackers.ToDictionary(t => t.ProviderCode, t => t);

        var activeShipments = await context.Shipments
            .Include(s => s.ShippingProvider)
            .Where(s => s.TrackingCode != null
                && s.Status != "Delivered"
                && s.Status != "Cancelled")
            .ToListAsync(ct);

        foreach (var shipment in activeShipments)
        {
            var providerCode = shipment.ShippingProvider?.Code;
            if (providerCode == null || !trackerMap.TryGetValue(providerCode, out var tracker))
                continue;

            try
            {
                var result = await tracker.TrackAsync(shipment.TrackingCode!, ct);
                if (result == null) continue;

                var mappedStatus = MapCarrierStatus(providerCode, result.CarrierStatus);
                if (mappedStatus == null || mappedStatus == shipment.Status)
                    continue;

                _logger.LogInformation(
                    "Shipment {ShipmentId} ({Provider}): {OldStatus} -> {NewStatus}",
                    shipment.Id, providerCode, shipment.Status, mappedStatus);

                var description = result.Logs?.LastOrDefault()?.Description
                    ?? $"{providerCode}: {result.CarrierStatus}";
                await statusService.UpdateStatusAsync(
                    shipment.Id, mappedStatus, description, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to track shipment {ShipmentId} ({TrackingCode})", shipment.Id, shipment.TrackingCode);
            }
        }
    }

    private static string? MapCarrierStatus(string providerCode, string carrierStatus) => providerCode switch
    {
        "Lalamove" => LalamoveTracker.MapStatus(carrierStatus),
        "GHN" => GhnTracker.MapStatus(carrierStatus),
        _ => null,
    };
}
