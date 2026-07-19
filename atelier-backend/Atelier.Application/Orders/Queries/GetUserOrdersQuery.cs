using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Queries;

public class GetUserOrdersQuery : IRequest<List<GetUserOrdersQuery.OrderSummary>>
{
    public int UserId { get; set; }

    public class OrderSummary
    {
        public int Id { get; set; }
        public string? OrderCode { get; set; }
        public decimal TotalAmount { get; set; }
        public string? OrderStatus { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemSummary> Items { get; set; } = new();
    }

    public class OrderItemSummary
    {
        public int? ProductVariantId { get; set; }
        public string? ProductName { get; set; }
        public string? VariantName { get; set; }
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public string? ImageUrl { get; set; }
    }
}

public class GetUserOrdersQueryHandler : IRequestHandler<GetUserOrdersQuery, List<GetUserOrdersQuery.OrderSummary>>
{
    private readonly IApplicationDbContext _context;

    public GetUserOrdersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<GetUserOrdersQuery.OrderSummary>> Handle(GetUserOrdersQuery request, CancellationToken cancellationToken)
    {
        var orders = await _context.Orders
            .Where(o => o.UserId == request.UserId)
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(pv => pv.ProductVariantImages)
            .OrderByDescending(o => o.CreatedAt)
            .Select(o => new GetUserOrdersQuery.OrderSummary
            {
                Id = o.Id,
                OrderCode = o.OrderCode,
                TotalAmount = o.TotalAmount,
                OrderStatus = o.OrderStatus,
                CreatedAt = o.CreatedAt,
                Items = o.OrderItems.Select(oi => new GetUserOrdersQuery.OrderItemSummary
                {
                    ProductVariantId = oi.ProductVariantId,
                    ProductName = oi.ProductNameSnapshot,
                    VariantName = oi.VariantSnapshot,
                    Quantity = oi.Quantity,
                    UnitPrice = oi.UnitPrice,
                    ImageUrl = oi.ProductVariant != null
                        ? oi.ProductVariant.ProductVariantImages
                            .OrderByDescending(img => img.IsPrimary)
                            .Select(img => img.ImageUrl)
                            .FirstOrDefault()
                        : null,
                }).ToList(),
            })
            .ToListAsync(cancellationToken);

        return orders;
    }
}
