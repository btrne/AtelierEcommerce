using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetLowConversionProductsQuery
    : IRequest<List<GetLowConversionProductsQuery.LowConversionProductDto>>
{
    public int TopN { get; set; } = 5;

    public class LowConversionProductDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Views { get; set; }
        public int CartAdds { get; set; }
        public double ConversionRate { get; set; }
        public string? ThumbnailUrl { get; set; }
    }
}

public class GetLowConversionProductsQueryHandler
    : IRequestHandler<GetLowConversionProductsQuery,
        List<GetLowConversionProductsQuery.LowConversionProductDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetLowConversionProductsQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<GetLowConversionProductsQuery.LowConversionProductDto>> Handle(
        GetLowConversionProductsQuery request, CancellationToken cancellationToken)
    {
        var since = _dateTime.UtcNow.AddDays(-30);

        var viewCounts = await _context.UserEvents
            .Where(e => e.EventType == "view_product"
                        && e.EntityType == "Product"
                        && e.EntityId != null
                        && e.CreatedAt >= since)
            .GroupBy(e => e.EntityId!.Value)
            .Select(g => new { ProductId = g.Key, Views = g.Count() })
            .ToListAsync(cancellationToken);

        var cartCounts = await _context.UserEvents
            .Where(e => e.EventType == "add_to_cart"
                        && e.EntityType == "Product"
                        && e.EntityId != null
                        && e.CreatedAt >= since)
            .GroupBy(e => e.EntityId!.Value)
            .Select(g => new { ProductId = g.Key, CartAdds = g.Count() })
            .ToListAsync(cancellationToken);

        var viewMap = viewCounts.ToDictionary(v => v.ProductId, v => v.Views);
        var cartMap = cartCounts.ToDictionary(c => c.ProductId, c => c.CartAdds);

        var productIds = viewMap.Keys.Union(cartMap.Keys).ToList();
        if (productIds.Count == 0) return new List<GetLowConversionProductsQuery.LowConversionProductDto>();

        var products = await _context.Products
            .Where(p => productIds.Contains(p.Id))
            .Select(p => new { p.Id, p.Name, ThumbnailUrl = p.ProductVariants
                .SelectMany(v => v.ProductVariantImages)
                .OrderByDescending(img => img.IsPrimary)
                .Select(img => img.ImageUrl)
                .FirstOrDefault() })
            .ToListAsync(cancellationToken);

        var productMap = products.ToDictionary(p => p.Id);

        var result = productIds
            .Select(id =>
            {
                var views = viewMap.GetValueOrDefault(id, 0);
                var cartAdds = cartMap.GetValueOrDefault(id, 0);
                return new GetLowConversionProductsQuery.LowConversionProductDto
                {
                    ProductId = id,
                    ProductName = productMap.GetValueOrDefault(id)?.Name ?? "Unknown",
                    Views = views,
                    CartAdds = cartAdds,
                    ConversionRate = views > 0 ? Math.Round((double)cartAdds / views * 100, 2) : 0,
                    ThumbnailUrl = productMap.GetValueOrDefault(id)?.ThumbnailUrl,
                };
            })
            .Where(x => x.Views >= 10) // chỉ lấy sp có ít nhất 10 lượt xem
            .OrderBy(x => x.ConversionRate)
            .Take(request.TopN)
            .ToList();

        return result;
    }
}
