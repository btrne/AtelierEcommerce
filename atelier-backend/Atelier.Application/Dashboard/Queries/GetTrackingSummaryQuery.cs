using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetTrackingSummaryQuery : IRequest<GetTrackingSummaryQuery.TrackingSummaryDto>
{
    public int Days { get; set; } = 7;

    public class TrackingSummaryDto
    {
        public int TotalViews { get; set; }
        public int TotalSearches { get; set; }
        public int TotalAddToCart { get; set; }
        public int TotalOrders { get; set; }
        public double ConversionRate { get; set; }
    }
}

public class GetTrackingSummaryQueryHandler
    : IRequestHandler<GetTrackingSummaryQuery, GetTrackingSummaryQuery.TrackingSummaryDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetTrackingSummaryQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<GetTrackingSummaryQuery.TrackingSummaryDto> Handle(
        GetTrackingSummaryQuery request, CancellationToken cancellationToken)
    {
        var since = _dateTime.UtcNow.AddDays(-request.Days);

        var totalViews = await _context.UserEvents
            .CountAsync(e => e.EventType == "view_product" && e.CreatedAt >= since, cancellationToken);

        var totalSearches = await _context.UserEvents
            .CountAsync(e => e.EventType == "search" && e.CreatedAt >= since, cancellationToken);

        var totalAddToCart = await _context.UserEvents
            .CountAsync(e => e.EventType == "add_to_cart" && e.CreatedAt >= since, cancellationToken);

        var totalOrders = await _context.Orders
            .CountAsync(o => o.CreatedAt >= since && o.OrderStatus == "Completed", cancellationToken);

        var conversionRate = totalViews > 0
            ? Math.Round((double)totalOrders / totalViews * 100, 2)
            : 0.0;

        return new GetTrackingSummaryQuery.TrackingSummaryDto
        {
            TotalViews = totalViews,
            TotalSearches = totalSearches,
            TotalAddToCart = totalAddToCart,
            TotalOrders = totalOrders,
            ConversionRate = conversionRate,
        };
    }
}
