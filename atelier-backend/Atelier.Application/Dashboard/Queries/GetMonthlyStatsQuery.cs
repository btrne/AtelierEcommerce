using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetMonthlyStatsQuery : IRequest<MonthlyStatsDto>
{
}

public class MonthlyStatsDto
{
    public decimal Revenue { get; set; }
    public decimal PrevRevenue { get; set; }
    public int TotalOrders { get; set; }
    public int PrevTotalOrders { get; set; }
    public int NewCustomers { get; set; }
    public int PrevNewCustomers { get; set; }
}

public class GetMonthlyStatsQueryHandler
    : IRequestHandler<GetMonthlyStatsQuery, MonthlyStatsDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetMonthlyStatsQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<MonthlyStatsDto> Handle(
        GetMonthlyStatsQuery request,
        CancellationToken cancellationToken)
    {
        var localNow = _dateTime.LocalNow;
        var tz = _dateTime.LocalTimeZone;
        var monthStart = TimeZoneInfo.ConvertTimeToUtc(
            new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0), tz);
        var nextMonthStart = TimeZoneInfo.ConvertTimeToUtc(
            new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0).AddMonths(1), tz);
        var prevMonthStart = TimeZoneInfo.ConvertTimeToUtc(
            new DateTime(localNow.Year, localNow.Month, 1, 0, 0, 0).AddMonths(-1), tz);

        var revenue = await _context.Orders
            .Where(o => o.CreatedAt >= monthStart && o.CreatedAt < nextMonthStart
                        && o.OrderStatus == "Completed")
            .SumAsync(o => (decimal?)o.TotalAmount, cancellationToken) ?? 0m;

        var prevRevenue = await _context.Orders
            .Where(o => o.CreatedAt >= prevMonthStart && o.CreatedAt < monthStart
                        && o.OrderStatus == "Completed")
            .SumAsync(o => (decimal?)o.TotalAmount, cancellationToken) ?? 0m;

        var totalOrders = await _context.Orders
            .CountAsync(o => o.CreatedAt >= monthStart && o.CreatedAt < nextMonthStart,
                cancellationToken);

        var prevTotalOrders = await _context.Orders
            .CountAsync(o => o.CreatedAt >= prevMonthStart && o.CreatedAt < monthStart,
                cancellationToken);

        var newCustomers = await _context.Users
            .CountAsync(u => u.CreatedAt >= monthStart && u.CreatedAt < nextMonthStart,
                cancellationToken);

        var prevNewCustomers = await _context.Users
            .CountAsync(u => u.CreatedAt >= prevMonthStart && u.CreatedAt < monthStart,
                cancellationToken);

        return new MonthlyStatsDto
        {
            Revenue = revenue,
            PrevRevenue = prevRevenue,
            TotalOrders = totalOrders,
            PrevTotalOrders = prevTotalOrders,
            NewCustomers = newCustomers,
            PrevNewCustomers = prevNewCustomers,
        };
    }
}
