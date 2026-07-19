namespace Atelier.Application.Common.Interfaces;

public interface IDateTime
{
    DateTime UtcNow { get; }
    DateTime LocalNow { get; }
    TimeZoneInfo LocalTimeZone { get; }
}
