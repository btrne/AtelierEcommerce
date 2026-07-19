using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Shipping.Queries;

public class GetAllShipmentsQuery : IRequest<PaginatedList<ShipmentDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllShipmentsQueryHandler : IRequestHandler<GetAllShipmentsQuery, PaginatedList<ShipmentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllShipmentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ShipmentDto>> Handle(GetAllShipmentsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Shipments
            .Include(s => s.ShippingProvider)
            .Include(s => s.Order)
            .OrderByDescending(s => s.CreatedAt);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(s => new ShipmentDto
            {
                Id = s.Id,
                OrderId = s.OrderId,
                OrderCode = s.Order.OrderCode,
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
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<ShipmentDto>(items, totalCount, request.Page, request.PageSize);
    }
}