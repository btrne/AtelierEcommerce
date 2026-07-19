using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetTopAddToCartProductsQuery : IRequest<List<GetTopAddToCartProductsQuery.RankedProductDto>>
{
    public int Days { get; set; } = 7;
    public int TopN { get; set; } = 5;

    public class RankedProductDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Count { get; set; }
        public string? ThumbnailUrl { get; set; }
    }
}

public class GetTopAddToCartProductsQueryHandler
    : IRequestHandler<GetTopAddToCartProductsQuery, List<GetTopAddToCartProductsQuery.RankedProductDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetTopAddToCartProductsQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<GetTopAddToCartProductsQuery.RankedProductDto>> Handle(
        GetTopAddToCartProductsQuery request, CancellationToken cancellationToken)
    {
        var since = _dateTime.UtcNow.AddDays(-request.Days);

        var variantCounts = await _context.UserEvents
            .Where(e => e.EventType == "add_to_cart"
                        && e.EntityType == "Product"
                        && e.EntityId != null
                        && e.CreatedAt >= since)
            .GroupBy(e => e.EntityId!.Value)
            .Select(g => new { VariantId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(request.TopN)
            .ToListAsync(cancellationToken);

        if (variantCounts.Count == 0) return new List<GetTopAddToCartProductsQuery.RankedProductDto>();

        var variantIds = variantCounts.Select(x => x.VariantId).ToList();
        var variantToProduct = await _context.ProductVariants
            .Where(v => variantIds.Contains(v.Id))
            .Select(v => new { v.Id, v.ProductId })
            .ToListAsync(cancellationToken);

        var productCounts = variantCounts
            .Join(variantToProduct, vc => vc.VariantId, vp => vp.Id, (vc, vp) => new { vp.ProductId, vc.Count })
            .GroupBy(x => x.ProductId)
            .Select(g => new { ProductId = g.Key, Count = g.Sum(x => x.Count) })
            .OrderByDescending(x => x.Count)
            .ToList();

        var productIds = productCounts.Select(x => x.ProductId).ToList();
        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, ThumbnailUrl = p.ProductVariants
                .SelectMany(v => v.ProductVariantImages)
                .OrderByDescending(img => img.IsPrimary)
                .Select(img => img.ImageUrl)
                .FirstOrDefault() })
            .ToListAsync(cancellationToken);

        var productMap = products.ToDictionary(p => p.Id);

        return productCounts.Select(v => new GetTopAddToCartProductsQuery.RankedProductDto
        {
            ProductId = v.ProductId,
            ProductName = productMap.GetValueOrDefault(v.ProductId)?.Name ?? "Unknown",
            Count = v.Count,
            ThumbnailUrl = productMap.GetValueOrDefault(v.ProductId)?.ThumbnailUrl,
        }).ToList();
    }
}
