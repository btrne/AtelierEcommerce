using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Ratings.Queries;

public class GetCanReviewProductQuery : IRequest<bool>
{
    public int ProductId { get; set; }
    public int UserId { get; set; }
}

public class GetCanReviewProductQueryHandler : IRequestHandler<GetCanReviewProductQuery, bool>
{
    private readonly IApplicationDbContext _context;

    public GetCanReviewProductQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(GetCanReviewProductQuery request, CancellationToken cancellationToken)
    {
        var orderItem = await _context.OrderItems
            .Include(oi => oi.Order)
            .Include(oi => oi.ProductVariant)
            .FirstOrDefaultAsync(oi =>
                oi.Order.UserId == request.UserId &&
                oi.Order.OrderStatus == "Completed" &&
                oi.ProductVariant != null &&
                oi.ProductVariant.ProductId == request.ProductId &&
                !_context.Ratings.Any(r => r.OrderItemId == oi.Id && r.UserId == request.UserId),
                cancellationToken);

        return orderItem != null;
    }
}
