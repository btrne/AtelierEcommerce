using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries
{
    public class GetDashboardStatsQueryHandler : IRequestHandler<GetDashboardStatsQuery, object>
    {
        private readonly IApplicationDbContext _context;
        private readonly IDateTime _dateTime;

        public GetDashboardStatsQueryHandler(IApplicationDbContext context, IDateTime dateTime)
        {
            _context = context;
            _dateTime = dateTime;
        }

        public async Task<object> Handle(GetDashboardStatsQuery request, CancellationToken cancellationToken)
        {
            var localToday = _dateTime.LocalNow.Date;
            var startDate = TimeZoneInfo.ConvertTimeToUtc(localToday.AddDays(-request.Days), _dateTime.LocalTimeZone);

            var stats = await _context.Orders
                .Where(o => o.CreatedAt >= startDate && o.OrderStatus == "Completed")
                .ToListAsync(cancellationToken);

            var grouped = stats
                .GroupBy(o => TimeZoneInfo.ConvertTimeFromUtc(o.CreatedAt, _dateTime.LocalTimeZone).Date)
                .Select(g => new
                {
                    Date = g.Key,
                    TotalRevenue = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count()
                })
                .OrderBy(g => g.Date)
                .ToList();

            var totalOrders = await _context.Orders.CountAsync(cancellationToken);
            var totalRevenue = await _context.Orders
                .Where(o => o.OrderStatus == "Completed")
                .SumAsync(o => (decimal?)o.TotalAmount, cancellationToken) ?? 0m;

            return new
            {
                Summary = new { TotalOrders = totalOrders, TotalRevenue = totalRevenue },
                DailyStats = grouped
            };
        }
    }
}
