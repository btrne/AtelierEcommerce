using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Queries;

public class GetOrderByIdQuery : IRequest<object?>
{
    public int Id { get; set; }
    public int? UserId { get; set; }
}

public class GetOrderByIdQueryHandler : IRequestHandler<GetOrderByIdQuery, object?>
{
    private readonly IApplicationDbContext _context;

    public GetOrderByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<object?> Handle(GetOrderByIdQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(pv => pv.ProductVariantImages)
            .Include(o => o.PaymentMethod)
            .Include(o => o.OrderLogs)
            .Include(o => o.Shipments)
                .ThenInclude(s => s.ShippingProvider)
            .Include(o => o.Shipments)
                .ThenInclude(s => s.ShipmentTrackingLogs)
            .AsQueryable();

        if (request.UserId.HasValue)
            query = query.Where(o => o.UserId == request.UserId.Value);

        var order = await query
            .Where(o => o.Id == request.Id)
            .Select(o => new
            {
                id = o.Id,
                orderCode = o.OrderCode,
                status = o.OrderStatus,
                subtotal = o.SubtotalAmount,
                shippingFee = o.ShippingFee,
                voucherDiscount = o.VoucherDiscount,
                total = o.TotalAmount,
                paymentMethod = o.PaymentMethod != null ? o.PaymentMethod.Name : "",
                shippingContactName = o.ShippingContactName,
                shippingPhone = o.ShippingPhone,
                shippingAddress = $"{o.ShippingDetail}, {o.ShippingWard}, {o.ShippingDistrict}, {o.ShippingProvince}",
                createdAt = o.CreatedAt,
                cancelledAt = o.CancelledAt,
                items = o.OrderItems.Select(oi => new
                {
                    id = oi.Id,
                    productVariantId = oi.ProductVariantId,
                    productName = oi.ProductNameSnapshot,
                    variantName = oi.VariantSnapshot,
                    quantity = oi.Quantity,
                    unitPrice = oi.UnitPrice,
                    imageUrl = oi.ProductVariant != null
                        ? oi.ProductVariant.ProductVariantImages
                            .OrderByDescending(img => img.IsPrimary == true)
                            .Select(img => img.ImageUrl)
                            .FirstOrDefault()
                        : null,
                }).ToList(),
                orderLogs = o.OrderLogs.OrderByDescending(l => l.CreatedAt).Select(l => new
                {
                    id = l.Id,
                    orderId = l.OrderId,
                    fromStatus = l.FromStatus,
                    toStatus = l.ToStatus,
                    note = l.Note,
                    createdAt = l.CreatedAt,
                }).ToList(),
                shipments = o.Shipments.OrderByDescending(s => s.CreatedAt).Select(s => new
                {
                    id = s.Id,
                    orderId = s.OrderId,
                    shippingProviderName = s.ShippingProvider.Name,
                    trackingCode = s.TrackingCode,
                    shippingFee = s.ShippingFee,
                    status = s.Status,
                    deliveryAttemptCount = s.DeliveryAttemptCount,
                    estimatedDeliveryDate = s.EstimatedDeliveryDate,
                    shippedAt = s.ShippedAt,
                    deliveredAt = s.DeliveredAt,
                    createdAt = s.CreatedAt,
                    trackingLogs = s.ShipmentTrackingLogs.OrderByDescending(t => t.CreatedAt).Select(t => new
                    {
                        id = t.Id,
                        shipmentId = t.ShipmentId,
                        status = t.Status,
                        description = t.Description,
                        createdAt = t.CreatedAt,
                    }).ToList(),
                }).ToList(),
            })
            .FirstOrDefaultAsync(cancellationToken);

        return order;
    }
}
