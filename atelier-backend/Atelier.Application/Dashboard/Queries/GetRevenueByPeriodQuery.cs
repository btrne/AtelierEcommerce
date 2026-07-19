using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public enum PeriodType
{
    Daily,
    Weekly,
    Monthly,
    Quarterly,
    Yearly
}

public class GetRevenueByPeriodQuery : IRequest<List<PeriodRevenueDto>>
{
    public PeriodType Period { get; set; } = PeriodType.Monthly;
    public int NumberOfPeriods { get; set; } = 12;
}

public class PeriodRevenueDto
{
    public string Label { get; set; } = null!;
    public DateTime StartDate { get; set; }
    public decimal TotalRevenue { get; set; }
    public int OrderCount { get; set; }
}

public class GetRevenueByPeriodQueryHandler : IRequestHandler<GetRevenueByPeriodQuery, List<PeriodRevenueDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetRevenueByPeriodQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<PeriodRevenueDto>> Handle(GetRevenueByPeriodQuery request, CancellationToken cancellationToken)
    {
        var localNow = _dateTime.LocalNow;
        var tz = _dateTime.LocalTimeZone;
        var startDate = request.Period switch
        {
            PeriodType.Daily => TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddDays(-request.NumberOfPeriods), tz),
            PeriodType.Weekly => TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddDays(-7 * request.NumberOfPeriods), tz),
            PeriodType.Monthly => TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddMonths(-request.NumberOfPeriods), tz),
            PeriodType.Quarterly => TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddMonths(-3 * request.NumberOfPeriods), tz),
            PeriodType.Yearly => TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddYears(-request.NumberOfPeriods), tz),
            _ => TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddDays(-request.NumberOfPeriods), tz),
        };

        var orders = await _context.Orders
            .Where(o => o.CreatedAt >= startDate && o.OrderStatus == "Completed")
            .ToListAsync(cancellationToken);

        var localOrders = orders
            .Select(o => new
            {
                LocalCreatedAt = TimeZoneInfo.ConvertTimeFromUtc(o.CreatedAt, tz),
                o.TotalAmount,
            })
            .ToList();

        var grouped = request.Period switch
        {
            PeriodType.Daily => localOrders
                .GroupBy(o => o.LocalCreatedAt.Date)
                .Select(g => new PeriodRevenueDto
                {
                    Label = g.Key.ToString("dd/MM"),
                    StartDate = g.Key,
                    TotalRevenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                }),

            PeriodType.Weekly => localOrders
                .GroupBy(o =>
                {
                    var date = o.LocalCreatedAt.Date;
                    var diff = (7 + (date.DayOfWeek - DayOfWeek.Monday)) % 7;
                    return date.AddDays(-diff);
                })
                .Select(g => new PeriodRevenueDto
                {
                    Label = $"Tuần {GetIso8601WeekOfYear(g.Key)}/{g.Key.Year}",
                    StartDate = g.Key,
                    TotalRevenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                }),

            PeriodType.Monthly => localOrders
                .GroupBy(o => new { o.LocalCreatedAt.Year, o.LocalCreatedAt.Month })
                .Select(g => new PeriodRevenueDto
                {
                    Label = $"{g.Key.Month:00}/{g.Key.Year}",
                    StartDate = new DateTime(g.Key.Year, g.Key.Month, 1),
                    TotalRevenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                }),

            PeriodType.Quarterly => localOrders
                .GroupBy(o => new
                {
                    o.LocalCreatedAt.Year,
                    Quarter = (o.LocalCreatedAt.Month - 1) / 3 + 1
                })
                .Select(g => new PeriodRevenueDto
                {
                    Label = $"Q{g.Key.Quarter}/{g.Key.Year}",
                    StartDate = new DateTime(g.Key.Year, (g.Key.Quarter - 1) * 3 + 1, 1),
                    TotalRevenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                }),

            PeriodType.Yearly => localOrders
                .GroupBy(o => o.LocalCreatedAt.Year)
                .Select(g => new PeriodRevenueDto
                {
                    Label = $"{g.Key}",
                    StartDate = new DateTime(g.Key, 1, 1),
                    TotalRevenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                }),

            _ => localOrders
                .GroupBy(o => o.LocalCreatedAt.Date)
                .Select(g => new PeriodRevenueDto
                {
                    Label = g.Key.ToString("dd/MM"),
                    StartDate = g.Key,
                    TotalRevenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                }),
        };

        return grouped.OrderBy(g => g.StartDate).ToList();
    }

    private static int GetIso8601WeekOfYear(DateTime date)
    {
        var culture = System.Globalization.CultureInfo.CurrentCulture;
        return culture.Calendar.GetWeekOfYear(date, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
    }
}
