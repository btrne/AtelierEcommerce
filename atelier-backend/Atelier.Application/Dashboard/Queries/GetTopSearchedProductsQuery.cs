using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetTopSearchedProductsQuery : IRequest<List<GetTopSearchedProductsQuery.RankedProductDto>>
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

public class GetTopSearchedProductsQueryHandler
    : IRequestHandler<GetTopSearchedProductsQuery, List<GetTopSearchedProductsQuery.RankedProductDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetTopSearchedProductsQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<GetTopSearchedProductsQuery.RankedProductDto>> Handle(
        GetTopSearchedProductsQuery request, CancellationToken cancellationToken)
    {
        var since = _dateTime.UtcNow.AddDays(-request.Days);

        var counts = await _context.UserEvents
            .Where(e => e.EventType == "search_result_click"
                        && e.EntityType == "Product"
                        && e.EntityId != null
                        && e.CreatedAt >= since)
            .GroupBy(e => e.EntityId!.Value)
            .Select(g => new { ProductId = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(request.TopN)
            .ToListAsync(cancellationToken);

        if (counts.Count == 0) return new List<GetTopSearchedProductsQuery.RankedProductDto>();

        var ids = counts.Select(x => x.ProductId).ToList();
        var products = await _context.Products
            .Where(p => ids.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, ThumbnailUrl = p.ProductVariants
                .SelectMany(v => v.ProductVariantImages)
                .OrderByDescending(img => img.IsPrimary)
                .Select(img => img.ImageUrl)
                .FirstOrDefault() })
            .ToListAsync(cancellationToken);

        var productMap = products.ToDictionary(p => p.Id);

        return counts.Select(v => new GetTopSearchedProductsQuery.RankedProductDto
        {
            ProductId = v.ProductId,
            ProductName = productMap.GetValueOrDefault(v.ProductId)?.Name ?? "Unknown",
            Count = v.Count,
            ThumbnailUrl = productMap.GetValueOrDefault(v.ProductId)?.ThumbnailUrl,
        }).ToList();
    }
}
