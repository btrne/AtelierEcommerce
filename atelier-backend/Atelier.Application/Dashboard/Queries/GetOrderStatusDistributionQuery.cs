using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetOrderStatusDistributionQuery : IRequest<List<OrderStatusCountDto>>
{
}

public class OrderStatusCountDto
{
    public string Status { get; set; } = null!;
    public int Count { get; set; }
    public decimal TotalAmount { get; set; }
}

public class GetOrderStatusDistributionQueryHandler
    : IRequestHandler<GetOrderStatusDistributionQuery, List<OrderStatusCountDto>>
{
    private readonly IApplicationDbContext _context;

    public GetOrderStatusDistributionQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<OrderStatusCountDto>> Handle(
        GetOrderStatusDistributionQuery request,
        CancellationToken cancellationToken)
    {
        var result = await _context.Orders
            .GroupBy(o => o.OrderStatus)
            .Select(g => new OrderStatusCountDto
            {
                Status = g.Key,
                Count = g.Count(),
                TotalAmount = g.Sum(o => o.TotalAmount),
            })
            .OrderByDescending(x => x.Count)
            .ToListAsync(cancellationToken);

        return result;
    }
}
