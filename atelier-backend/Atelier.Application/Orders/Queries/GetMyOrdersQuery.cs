using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Queries;

public class GetMyOrdersQuery : IRequest<PaginatedList<MyOrderDto>>
{
    public int UserId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
    public string? Status { get; set; }
}

public class MyOrderDto
{
    public int Id { get; set; }
    public string OrderCode { get; set; } = null!;
    public string Status { get; set; } = null!;
    public decimal TotalAmount { get; set; }
    public string ShippingAddress { get; set; } = null!;
    public string PaymentMethod { get; set; } = null!;
    public string PaymentStatus { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public List<MyOrderItemDto> Items { get; set; } = new();
}

public class MyOrderItemDto
{
    public int Id { get; set; }
    public string ProductName { get; set; } = null!;
    public string ProductImage { get; set; } = null!;
    public string VariantInfo { get; set; } = null!;
    public decimal UnitPrice { get; set; }
    public int Quantity { get; set; }
    public bool HasReviewed { get; set; }
}

public class GetMyOrdersQueryHandler : IRequestHandler<GetMyOrdersQuery, PaginatedList<MyOrderDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMyOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<MyOrderDto>> Handle(GetMyOrdersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Orders
            .Include(o => o.PaymentMethod)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(pv => pv.ProductVariantImages)
            .Include(o => o.Payments)
            .Where(o => o.UserId == request.UserId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status))
            query = query.Where(o => o.OrderStatus == request.Status);

        var totalCount = await query.CountAsync(cancellationToken);

        var orders = await query
            .OrderByDescending(o => o.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(o => new MyOrderDto
            {
                Id = o.Id,
                OrderCode = o.OrderCode ?? "",
                Status = o.OrderStatus ?? "",
                TotalAmount = o.TotalAmount,
                ShippingAddress = $"{o.ShippingDetail}, {o.ShippingWard}, {o.ShippingDistrict}, {o.ShippingProvince}",
                PaymentMethod = o.PaymentMethod != null ? o.PaymentMethod.Name ?? "" : "",
                PaymentStatus = o.Payments.Any() ? o.Payments.OrderByDescending(p => p.Id).First().Status : "",
                CreatedAt = o.CreatedAt,
                Items = o.OrderItems.Select(oi => new MyOrderItemDto
                {
                    Id = oi.Id,
                    ProductName = oi.ProductNameSnapshot ?? "",
                    ProductImage = oi.ProductVariant != null
                        ? oi.ProductVariant.ProductVariantImages
                            .OrderByDescending(img => img.IsPrimary)
                            .Select(img => img.ImageUrl)
                            .FirstOrDefault() ?? ""
                        : "",
                    VariantInfo = oi.VariantSnapshot ?? "",
                    UnitPrice = oi.UnitPrice,
                    Quantity = oi.Quantity,
                }).ToList(),
            })
            .ToListAsync(cancellationToken);

        var ratedOrderItemIds = await _context.Ratings
            .Where(r => r.UserId == request.UserId)
            .Select(r => r.OrderItemId)
            .ToListAsync(cancellationToken);

        foreach (var order in orders)
        {
            foreach (var item in order.Items)
            {
                if (ratedOrderItemIds.Contains(item.Id))
                    item.HasReviewed = true;
            }
        }

        return new PaginatedList<MyOrderDto>(orders, totalCount, request.Page, request.PageSize);
    }
}
