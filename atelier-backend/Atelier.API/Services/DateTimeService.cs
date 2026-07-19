using Atelier.Application.Common.Interfaces;

namespace Atelier.Api.Services;

public class DateTimeService : IDateTime
{
    private readonly TimeZoneInfo _timeZone;

    public DateTimeService(string timeZoneId)
    {
        _timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
    }

    public DateTime UtcNow => DateTime.UtcNow;

    public DateTime LocalNow => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, _timeZone);

    public TimeZoneInfo LocalTimeZone => _timeZone;
}
