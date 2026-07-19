using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Queries;

public class GetAllOrdersQuery : IRequest<PaginatedList<OrderAdminDto>>
{
    public string? Status { get; set; }
    public string? Search { get; set; }
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllOrdersQueryHandler : IRequestHandler<GetAllOrdersQuery, PaginatedList<OrderAdminDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<OrderAdminDto>> Handle(GetAllOrdersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Orders
            .Include(o => o.User)
            .Include(o => o.PaymentMethod)
            .Include(o => o.OrderItems)
            .Include(o => o.Payments)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status))
            query = query.Where(o => o.OrderStatus == request.Status);

        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(o =>
                o.OrderCode.Contains(request.Search) ||
                (o.User != null && o.User.FullName.Contains(request.Search)) ||
                o.ShippingContactName.Contains(request.Search) ||
                o.ShippingPhone.Contains(request.Search));

        if (request.DateFrom.HasValue)
            query = query.Where(o => o.CreatedAt >= request.DateFrom.Value);

        if (request.DateTo.HasValue)
            query = query.Where(o => o.CreatedAt <= request.DateTo.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(o => new OrderAdminDto
            {
                Id = o.Id,
                OrderCode = o.OrderCode ?? "",
                UserId = o.UserId,
                CustomerName = o.User != null ? o.User.FullName : o.ShippingContactName,
                CustomerEmail = o.User != null ? o.User.Email : "",
                CustomerPhone = o.User != null ? o.User.Phone : o.ShippingPhone,
                ShippingContactName = o.ShippingContactName ?? "",
                ShippingPhone = o.ShippingPhone ?? "",
                ShippingAddress = $"{o.ShippingDetail}, {o.ShippingWard}, {o.ShippingDistrict}, {o.ShippingProvince}",
                OrderStatus = o.OrderStatus ?? "",
                SubtotalAmount = o.SubtotalAmount,
                ShippingFee = o.ShippingFee,
                VoucherDiscount = o.VoucherDiscount,
                TotalAmount = o.TotalAmount,
                PaymentMethodName = o.PaymentMethod != null ? o.PaymentMethod.Name ?? "" : "",
                PaymentStatus = o.Payments.Any() ? o.Payments.OrderByDescending(p => p.Id).First().Status : null,
                PaidAt = o.Payments.Any() ? o.Payments.OrderByDescending(p => p.Id).First().PaidAt : null,
                ItemCount = o.OrderItems.Count,
                CreatedAt = o.CreatedAt,
                CancelledAt = o.CancelledAt,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<OrderAdminDto>(orders, totalCount, request.Page, request.PageSize);
    }
}
