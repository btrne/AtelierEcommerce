using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetTopCustomersQuery : IRequest<List<GetTopCustomersQuery.TopCustomerDto>>
{
    public int TopN { get; set; } = 5;

    public class TopCustomerDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Phone { get; set; }
        public int OrderCount { get; set; }
        public decimal TotalSpent { get; set; }
    }
}

public class GetTopCustomersQueryHandler : IRequestHandler<GetTopCustomersQuery, List<GetTopCustomersQuery.TopCustomerDto>>
{
    private readonly IApplicationDbContext _context;

    public GetTopCustomersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<GetTopCustomersQuery.TopCustomerDto>> Handle(GetTopCustomersQuery request, CancellationToken cancellationToken)
    {
        var items = await _context.Orders
            .Where(o => o.OrderStatus == "Completed" && o.UserId != null)
            .GroupBy(o => o.UserId!.Value)
            .Select(g => new
            {
                UserId = g.Key,
                OrderCount = g.Count(),
                TotalSpent = g.Sum(o => o.TotalAmount)
            })
            .OrderByDescending(x => x.TotalSpent)
            .Take(request.TopN)
            .ToListAsync(cancellationToken);

        var userIds = items.Select(i => i.UserId).ToList();
        var users = await _context.Users
            .Where(u => userIds.Contains(u.Id))
            .Select(u => new { u.Id, u.FullName, u.Email, u.Phone })
            .ToListAsync(cancellationToken);

        var userDict = users.ToDictionary(u => u.Id);

        return items.Select(i =>
        {
            var user = userDict.GetValueOrDefault(i.UserId);
            return new GetTopCustomersQuery.TopCustomerDto
            {
                UserId = i.UserId,
                FullName = user?.FullName ?? "N/A",
                Email = user?.Email ?? "N/A",
                Phone = user?.Phone,
                OrderCount = i.OrderCount,
                TotalSpent = i.TotalSpent,
            };
        }).ToList();
    }
}
