using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Shipping.Queries;

public class GetShipmentsForOrderQuery : IRequest<List<ShipmentDto>>
{
    public int OrderId { get; set; }
}

public class GetShipmentsForOrderQueryHandler : IRequestHandler<GetShipmentsForOrderQuery, List<ShipmentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetShipmentsForOrderQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ShipmentDto>> Handle(GetShipmentsForOrderQuery request, CancellationToken cancellationToken)
    {
        return await _context.Shipments
            .Include(s => s.ShippingProvider)
            .Include(s => s.ShipmentTrackingLogs)
            .Where(s => s.OrderId == request.OrderId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new ShipmentDto
            {
                Id = s.Id,
                OrderId = s.OrderId,
                ShippingProviderId = s.ShippingProviderId,
                ShippingProviderName = s.ShippingProvider.Name,
                TrackingCode = s.TrackingCode,
                ShippingFee = s.ShippingFee,
                Status = s.Status,
                DeliveryAttemptCount = s.DeliveryAttemptCount,
                EstimatedDeliveryDate = s.EstimatedDeliveryDate,
                ShippedAt = s.ShippedAt,
                DeliveredAt = s.DeliveredAt,
                CreatedAt = s.CreatedAt,
                TrackingLogs = s.ShipmentTrackingLogs.OrderByDescending(t => t.CreatedAt).Select(t => new ShipmentTrackingLogDto
                {
                    Id = t.Id,
                    ShipmentId = t.ShipmentId,
                    Status = t.Status,
                    Description = t.Description,
                    CreatedAt = t.CreatedAt,
                }).ToList(),
            })
            .ToListAsync(cancellationToken);
    }
}
