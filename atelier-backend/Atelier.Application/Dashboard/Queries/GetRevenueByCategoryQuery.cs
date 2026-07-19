using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetRevenueByCategoryQuery : IRequest<List<CategoryRevenueDto>>
{
    public DateTime? DateFrom { get; set; }
    public DateTime? DateTo { get; set; }
}

public class CategoryRevenueDto
{
    public string CategoryName { get; set; } = null!;
    public int CategoryId { get; set; }
    public decimal TotalRevenue { get; set; }
    public int OrderCount { get; set; }
    public int ProductCount { get; set; }
}

public class GetRevenueByCategoryQueryHandler : IRequestHandler<GetRevenueByCategoryQuery, List<CategoryRevenueDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetRevenueByCategoryQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<CategoryRevenueDto>> Handle(GetRevenueByCategoryQuery request, CancellationToken cancellationToken)
    {
        var tz = _dateTime.LocalTimeZone;
        var localNow = _dateTime.LocalNow;

        var dateFrom = request.DateFrom.HasValue
            ? request.DateFrom.Value
            : TimeZoneInfo.ConvertTimeToUtc(new DateTime(localNow.Year, 1, 1, 0, 0, 0), tz);

        var dateTo = request.DateTo.HasValue
            ? request.DateTo.Value
            : TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddDays(1), tz);

        var revenueByCategory = await _context.Orders
            .Where(o => o.CreatedAt >= dateFrom && o.CreatedAt < dateTo && o.OrderStatus == "Completed")
            .SelectMany(o => o.OrderItems)
            .GroupBy(oi => new { oi.ProductVariant.Product.CategoryId, oi.ProductVariant.Product.Category.Name })
            .Select(g => new CategoryRevenueDto
            {
                CategoryId = g.Key.CategoryId,
                CategoryName = g.Key.Name,
                TotalRevenue = g.Sum(oi => oi.Quantity * oi.UnitPrice),
                OrderCount = g.Select(oi => oi.OrderId).Distinct().Count(),
                ProductCount = g.Select(oi => oi.ProductVariant.ProductId).Distinct().Count(),
            })
            .OrderByDescending(c => c.TotalRevenue)
            .ToListAsync(cancellationToken);

        return revenueByCategory;
    }
}
