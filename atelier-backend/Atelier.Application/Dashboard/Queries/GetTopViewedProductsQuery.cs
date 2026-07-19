using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetTopViewedProductsQuery : IRequest<List<GetTopViewedProductsQuery.TopViewedProductDto>>
{
    public int Days { get; set; } = 7;
    public int TopN { get; set; } = 5;

    public class TopViewedProductDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Views { get; set; }
        public string? ThumbnailUrl { get; set; }
    }
}

public class GetTopViewedProductsQueryHandler
    : IRequestHandler<GetTopViewedProductsQuery, List<GetTopViewedProductsQuery.TopViewedProductDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetTopViewedProductsQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<GetTopViewedProductsQuery.TopViewedProductDto>> Handle(
        GetTopViewedProductsQuery request, CancellationToken cancellationToken)
    {
        var since = _dateTime.UtcNow.AddDays(-request.Days);

        var viewCounts = await _context.UserEvents
            .Where(e => e.EventType == "view_product"
                        && e.EntityType == "Product"
                        && e.EntityId != null
                        && e.CreatedAt >= since)
            .GroupBy(e => e.EntityId!.Value)
            .Select(g => new { ProductId = g.Key, Views = g.Count() })
            .OrderByDescending(x => x.Views)
            .Take(request.TopN)
            .ToListAsync(cancellationToken);

        if (viewCounts.Count == 0) return new List<GetTopViewedProductsQuery.TopViewedProductDto>();

        var ids = viewCounts.Select(x => x.ProductId).ToList();
        var products = await _context.Products
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, ThumbnailUrl = p.ProductVariants
                .SelectMany(v => v.ProductVariantImages)
                .OrderByDescending(img => img.IsPrimary)
                .Select(img => img.ImageUrl)
                .FirstOrDefault() })
            .ToListAsync(cancellationToken);

        var productMap = products.ToDictionary(p => p.Id);

        return viewCounts.Select(v => new GetTopViewedProductsQuery.TopViewedProductDto
        {
            ProductId = v.ProductId,
            ProductName = productMap.GetValueOrDefault(v.ProductId)?.Name ?? "Unknown",
            Views = v.Views,
            ThumbnailUrl = productMap.GetValueOrDefault(v.ProductId)?.ThumbnailUrl,
        }).ToList();
    }
}
