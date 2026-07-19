using MediatR;

namespace Atelier.Application.Dashboard.Queries
{
    public class GetDashboardStatsQuery : IRequest<object>
    {
        public int Days { get; set; } = 7;
    }
}