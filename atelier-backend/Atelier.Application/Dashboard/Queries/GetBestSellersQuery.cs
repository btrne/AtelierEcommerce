using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetBestSellersQuery : IRequest<List<GetBestSellersQuery.BestSellerDto>>
{
    public int TopN { get; set; } = 5;

    public class BestSellerDto
    {
        public int ProductVariantId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string VariantName { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public int TotalQuantity { get; set; }
        public decimal TotalRevenue { get; set; }
    }
}

public class GetBestSellersQueryHandler : IRequestHandler<GetBestSellersQuery, List<GetBestSellersQuery.BestSellerDto>>
{
    private readonly IApplicationDbContext _context;

    public GetBestSellersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<GetBestSellersQuery.BestSellerDto>> Handle(GetBestSellersQuery request, CancellationToken cancellationToken)
    {
        var items = await _context.OrderItems
            .Where(oi => oi.Order.OrderStatus == "Completed" && oi.ProductVariantId != null)
            .GroupBy(oi => new { oi.ProductVariantId, oi.ProductNameSnapshot, oi.VariantSnapshot })
            .Select(g => new
            {
                g.Key.ProductVariantId,
                g.Key.ProductNameSnapshot,
                g.Key.VariantSnapshot,
                TotalQuantity = g.Sum(oi => oi.Quantity),
                TotalRevenue = g.Sum(oi => oi.Quantity * oi.UnitPrice),
            })
            .OrderByDescending(x => x.TotalQuantity)
            .Take(request.TopN)
            .ToListAsync(cancellationToken);

        var variantIds = items.Select(i => i.ProductVariantId!.Value).ToList();
        var variantImages = await _context.ProductVariantImages
            .Where(vi => variantIds.Contains(vi.ProductVariantId) && vi.IsPrimary == true)
            .ToDictionaryAsync(vi => vi.ProductVariantId, vi => vi.ImageUrl, cancellationToken);

        return items.Select(i => new GetBestSellersQuery.BestSellerDto
        {
            ProductVariantId = i.ProductVariantId!.Value,
            ProductName = i.ProductNameSnapshot,
            VariantName = i.VariantSnapshot,
            ImageUrl = variantImages.GetValueOrDefault(i.ProductVariantId!.Value),
            TotalQuantity = i.TotalQuantity,
            TotalRevenue = i.TotalRevenue,
        }).ToList();
    }
}
