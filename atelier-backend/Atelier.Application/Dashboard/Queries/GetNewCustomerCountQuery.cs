using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetNewCustomerCountQuery : IRequest<NewCustomerCountDto>
{
    public int Days { get; set; } = 30;
}

public class NewCustomerCountDto
{
    public int CurrentPeriod { get; set; }
    public int PreviousPeriod { get; set; }
}

public class GetNewCustomerCountQueryHandler
    : IRequestHandler<GetNewCustomerCountQuery, NewCustomerCountDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetNewCustomerCountQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<NewCustomerCountDto> Handle(
        GetNewCustomerCountQuery request,
        CancellationToken cancellationToken)
    {
        var localNow = _dateTime.LocalNow;
        var tz = _dateTime.LocalTimeZone;

        var periodStart = TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddDays(-request.Days), tz);
        var prevPeriodStart = TimeZoneInfo.ConvertTimeToUtc(localNow.Date.AddDays(-2 * request.Days), tz);

        var currentPeriod = await _context.Users
            .CountAsync(u => u.CreatedAt >= periodStart, cancellationToken);

        var previousPeriod = await _context.Users
            .CountAsync(u => u.CreatedAt >= prevPeriodStart && u.CreatedAt < periodStart, cancellationToken);

        return new NewCustomerCountDto
        {
            CurrentPeriod = currentPeriod,
            PreviousPeriod = previousPeriod,
        };
    }
}
