using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Queries;

public class GetOrderDetailQuery : IRequest<OrderDetailAdminDto?>
{
    public int Id { get; set; }
    public GetOrderDetailQuery(int id) { Id = id; }
}

public class GetOrderDetailQueryHandler : IRequestHandler<GetOrderDetailQuery, OrderDetailAdminDto?>
{
    private readonly IApplicationDbContext _context;

    public GetOrderDetailQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<OrderDetailAdminDto?> Handle(GetOrderDetailQuery request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.User)
            .Include(o => o.PaymentMethod)
            .Include(o => o.Voucher)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(pv => pv.ProductVariantImages)
            .Include(o => o.Payments)
            .Include(o => o.OrderLogs)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (order == null) return null;

        return new OrderDetailAdminDto
        {
            Id = order.Id,
            OrderCode = order.OrderCode ?? "",
            UserId = order.UserId,
            CustomerName = order.User?.FullName,
            CustomerEmail = order.User?.Email,
            CustomerPhone = order.User?.Phone,
            ShippingContactName = order.ShippingContactName ?? "",
            ShippingPhone = order.ShippingPhone ?? "",
            ShippingProvince = order.ShippingProvince ?? "",
            ShippingDistrict = order.ShippingDistrict ?? "",
            ShippingWard = order.ShippingWard ?? "",
            ShippingDetail = order.ShippingDetail ?? "",
            OrderStatus = order.OrderStatus ?? "",
            PreferredCarrierCode = order.PreferredCarrierCode,
            SubtotalAmount = order.SubtotalAmount,
            ShippingFee = order.ShippingFee,
            VoucherDiscount = order.VoucherDiscount,
            TotalAmount = order.TotalAmount,
            VoucherCode = order.Voucher != null ? order.Voucher.Code : null,
            PaymentMethodName = order.PaymentMethod != null ? order.PaymentMethod.Name ?? "" : "",
            CreatedAt = order.CreatedAt,
            CancelledAt = order.CancelledAt,
            Items = order.OrderItems.Select(oi => new OrderItemAdminDto
            {
                Id = oi.Id,
                ProductVariantId = oi.ProductVariantId,
                ProductName = oi.ProductNameSnapshot ?? "",
                VariantName = oi.VariantSnapshot ?? "",
                Quantity = oi.Quantity,
                UnitPrice = oi.UnitPrice,
                ImageUrl = oi.ProductVariant != null
                    ? oi.ProductVariant.ProductVariantImages
                        .OrderByDescending(img => img.IsPrimary == true)
                        .Select(img => img.ImageUrl)
                        .FirstOrDefault()
                    : null,
            }).ToList(),
            Payments = order.Payments.Select(p => new PaymentDto
            {
                Id = p.Id,
                TransactionCode = p.TransactionCode,
                Amount = p.Amount,
                Status = p.Status ?? "",
                PaidAt = p.PaidAt,
            }).ToList(),
            OrderLogs = order.OrderLogs.OrderByDescending(l => l.CreatedAt).Select(l => new OrderLogDto
            {
                Id = l.Id,
                OrderId = l.OrderId,
                FromStatus = l.FromStatus,
                ToStatus = l.ToStatus,
                Note = l.Note,
                CreatedAt = l.CreatedAt,
            }).ToList(),
        };
    }
}
