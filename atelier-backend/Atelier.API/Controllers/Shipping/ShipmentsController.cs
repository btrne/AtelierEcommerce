using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Atelier.Application.Common.Interfaces;
using Atelier.Application.Shipping.Commands;
using Atelier.Application.Shipping.Queries;
using Atelier.Application.Shipping.Services;
using Atelier.Infrastructure.Shipping.Common;
using Atelier.Infrastructure.Shipping.GHN;
using Atelier.Infrastructure.Shipping.Lalamove;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Api.Controllers.Shipping;

[Route("api")]
[ApiController]
public class ShipmentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;
    private readonly IEnumerable<IShipmentTracker> _trackers;
    private readonly ShipmentStatusService _statusService;

    public ShipmentsController(
        IMediator mediator,
        IApplicationDbContext context,
        IEnumerable<IShipmentTracker> trackers,
        ShipmentStatusService statusService)
    {
        _mediator = mediator;
        _context = context;
        _trackers = trackers;
        _statusService = statusService;
    }

    [HttpGet("shipping-providers")]
    public async Task<IActionResult> GetShippingProviders([FromQuery] bool includeInactive = false)
    {
        var result = await _mediator.Send(new GetShippingProvidersQuery { IncludeInactive = includeInactive });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("shipments")]
    public async Task<IActionResult> GetAllShipments([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetAllShipmentsQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("orders/{orderId}/shipments")]
    public async Task<IActionResult> GetShipments(int orderId)
    {
        var result = await _mediator.Send(new GetShipmentsForOrderQuery { OrderId = orderId });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("orders/{orderId}/ship")]
    public async Task<IActionResult> CreateShipment(int orderId, [FromBody] CreateShipmentCommand command)
    {
        command.OrderId = orderId;
        try
        {
            var shipmentId = await _mediator.Send(command);
            return Ok(new { shipmentId, message = "Tạo vận đơn thành công" });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpGet("shipping/fee")]
    public async Task<IActionResult> CalculateShippingFee(
        [FromQuery] string province,
        [FromQuery] string district,
        [FromQuery] string ward,
        [FromQuery] decimal weight)
    {
        try
        {
            var result = await _mediator.Send(new CalculateShippingFeeQuery
            {
                Province = province,
                District = district,
                Ward = ward,
                Weight = weight,
            });
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("shipments/{shipmentId}/check-status")]
    public async Task<IActionResult> CheckStatus(int shipmentId)
    {
        var shipment = await _context.Shipments
            .Include(s => s.ShippingProvider)
            .Include(s => s.ShipmentTrackingLogs)
            .FirstOrDefaultAsync(s => s.Id == shipmentId);

        if (shipment == null)
            return NotFound(new { Error = "Không tìm thấy vận đơn" });

        if (string.IsNullOrEmpty(shipment.TrackingCode))
            return BadRequest(new { Error = "Vận đơn chưa có mã tracking" });

        var providerCode = shipment.ShippingProvider?.Code;
        var tracker = _trackers.FirstOrDefault(t => t.ProviderCode == providerCode);
        if (tracker == null)
            return BadRequest(new { Error = $"Chưa hỗ trợ tracker cho {providerCode}" });

        var result = await tracker.TrackAsync(shipment.TrackingCode);
        if (result == null)
            return BadRequest(new { Error = "Không thể lấy trạng thái từ carrier" });

        var mappedStatus = providerCode switch
        {
            "Lalamove" => LalamoveTracker.MapStatus(result.CarrierStatus),
            "GHN" => GhnTracker.MapStatus(result.CarrierStatus),
            _ => null,
        };

        var carrierStatusVietnamese = providerCode switch
        {
            "Lalamove" => LalamoveTracker.MapStatusToVietnamese(result.CarrierStatus),
            "GHN" => GhnTracker.MapStatusToVietnamese(result.CarrierStatus),
            _ => result.CarrierStatus,
        };

        var description = $"{providerCode}: {carrierStatusVietnamese}";

        // Get carrier timestamp from tracking result
        var lastLogEntry = result.Logs.LastOrDefault();
        var carrierTimestamp = lastLogEntry?.CarrierTimestamp;

        // Skip if the last log already has exactly the same carrier status (no new status from carrier)
        var lastExistingLog = shipment.ShipmentTrackingLogs
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefault();

        var lastCarrierStatus = lastExistingLog?.Description?.StartsWith(providerCode + ":") == true
            ? lastExistingLog.Description
            : null;

        var isDuplicate = mappedStatus != null && lastExistingLog?.Status == mappedStatus && lastCarrierStatus == description;

        if (!isDuplicate)
        {
            if (mappedStatus != null && mappedStatus != shipment.Status)
            {
                await _statusService.UpdateStatusAsync(shipment.Id, mappedStatus, description, carrierTimestamp: carrierTimestamp);
            }
            else
            {
                await _statusService.AddTrackingLogAsync(shipment.Id, result.CarrierStatus, description, carrierTimestamp: carrierTimestamp);
            }
        }

        var updatedShipment = await _context.Shipments
            .Include(s => s.ShipmentTrackingLogs)
            .FirstOrDefaultAsync(s => s.Id == shipmentId);

        return Ok(new
        {
            carrierStatus = result.CarrierStatus,
            carrierStatusVietnamese,
            currentStatus = mappedStatus ?? shipment.Status,
            trackingLogs = updatedShipment?.ShipmentTrackingLogs
                .OrderByDescending(t => t.CreatedAt)
                .Select(t => new
                {
                    t.Id, t.Status, t.Description, t.CreatedAt,
                }).ToList(),
        });
    }
}
