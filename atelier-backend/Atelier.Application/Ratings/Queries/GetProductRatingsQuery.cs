using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Ratings.Queries;

public class GetProductRatingsQuery : IRequest<object>
{
    public int ProductId { get; set; }
}

public class GetProductRatingsQueryHandler : IRequestHandler<GetProductRatingsQuery, object>
{
    private readonly IApplicationDbContext _context;

    public GetProductRatingsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<object> Handle(GetProductRatingsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Ratings
            .Include(r => r.User)
            .Include(r => r.OrderItem)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(pv => pv.Product)
            .Where(r => r.OrderItem.ProductVariant.ProductId == request.ProductId);

        var ratings = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new
            {
                id = r.Id,
                userId = r.UserId,
                userName = r.User.FullName ?? r.User.Email,
                stars = r.Stars,
                comment = r.Comment,
                createdAt = r.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        var average = ratings.Any() ? Math.Round(ratings.Average(r => r.stars), 1) : 0;
        var total = ratings.Count;

        return new
        {
            averageStars = average,
            totalRatings = total,
            items = ratings,
        };
    }
}
