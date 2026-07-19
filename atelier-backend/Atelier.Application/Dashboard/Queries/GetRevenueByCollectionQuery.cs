using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetRevenueByCollectionQuery : IRequest<List<CollectionRevenueDto>>
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
}

public class CollectionRevenueDto
{
    public int CollectionId { get; set; }
    public string CollectionName { get; set; } = null!;
    public decimal TotalRevenue { get; set; }
    public int OrderCount { get; set; }
    public int ProductCount { get; set; }
}

file class CollectionAccumulator
{
    public decimal Revenue { get; set; }
    public HashSet<int> Orders { get; } = new();
    public HashSet<int> Products { get; } = new();
    public string Name { get; set; } = null!;
}

public class GetRevenueByCollectionQueryHandler : IRequestHandler<GetRevenueByCollectionQuery, List<CollectionRevenueDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetRevenueByCollectionQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<CollectionRevenueDto>> Handle(GetRevenueByCollectionQuery request, CancellationToken cancellationToken)
    {
        var tz = _dateTime.LocalTimeZone;
        var localNow = _dateTime.LocalNow;

        var dateFrom = request.DateFrom.HasValue
            ? request.DateFrom.Value
            : TimeZoneInfo.ConvertTimeToUtc(new DateTime(localNow.Year, 1, 1, 0, 0, 0), tz);

        var dateTo = request.DateTo.HasValue
            ? request.DateTo.Value
            : TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddDays(1), tz);

        var items = await _context.Orders
            .Where(o => o.CreatedAt >= dateFrom && o.CreatedAt < dateTo && o.OrderStatus == "Completed")
            .SelectMany(o => o.OrderItems)
            .Select(oi => new
            {
                oi.OrderId,
                Revenue = oi.Quantity * oi.UnitPrice,
                oi.ProductVariant.ProductId,
                Collections = oi.ProductVariant.Product.ProductCollections
                    .Select(pc => new { pc.CollectionId, pc.Collection.Name })
            })
            .ToListAsync(cancellationToken);

        var map = new Dictionary<int, CollectionAccumulator>();

        foreach (var item in items)
        {
            if (!item.Collections.Any())
            {
                if (!map.TryGetValue(-1, out var acc))
                    map[-1] = acc = new CollectionAccumulator { Name = "Chưa phân loại" };
                acc.Revenue += item.Revenue;
                acc.Orders.Add(item.OrderId);
                acc.Products.Add(item.ProductId);
                continue;
            }

            foreach (var c in item.Collections)
            {
                if (!map.TryGetValue(c.CollectionId, out var acc))
                    map[c.CollectionId] = acc = new CollectionAccumulator { Name = c.Name };
                acc.Revenue += item.Revenue;
                acc.Orders.Add(item.OrderId);
                acc.Products.Add(item.ProductId);
            }
        }

        return map
            .Select(kvp => new CollectionRevenueDto
            {
                CollectionId = kvp.Key,
                CollectionName = kvp.Value.Name,
                TotalRevenue = kvp.Value.Revenue,
                OrderCount = kvp.Value.Orders.Count,
                ProductCount = kvp.Value.Products.Count,
            })
            .OrderByDescending(c => c.TotalRevenue)
            .ToList();
    }
}
