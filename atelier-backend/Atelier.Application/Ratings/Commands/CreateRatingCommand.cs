using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Ratings.Commands;

public class CreateRatingCommand : IRequest<bool>
{
    public int OrderItemId { get; set; }
    public int UserId { get; set; }
    public int Stars { get; set; }
    public string? Comment { get; set; }
}

public class CreateRatingCommandHandler : IRequestHandler<CreateRatingCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CreateRatingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(CreateRatingCommand request, CancellationToken cancellationToken)
    {
        if (request.Stars < 1 || request.Stars > 5)
            throw new Exception("Số sao phải từ 1 đến 5.");

        var orderItem = await _context.OrderItems
            .Include(oi => oi.Order)
            .FirstOrDefaultAsync(oi => oi.Id == request.OrderItemId, cancellationToken);

        if (orderItem == null)
            throw new Exception("Không tìm thấy sản phẩm trong đơn hàng.");

        if (orderItem.Order.UserId != request.UserId)
            throw new Exception("Bạn không thể đánh giá sản phẩm của người khác.");

        if (orderItem.Order.OrderStatus != "Completed")
            throw new Exception("Chỉ có thể đánh giá sản phẩm khi đơn hàng đã hoàn thành.");

        var existing = await _context.Ratings
            .AnyAsync(r => r.OrderItemId == request.OrderItemId && r.UserId == request.UserId, cancellationToken);
        if (existing)
            throw new Exception("Bạn đã đánh giá sản phẩm này rồi.");

        var rating = new Rating
        {
            OrderItemId = request.OrderItemId,
            UserId = request.UserId,
            Stars = request.Stars,
            Comment = request.Comment,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Ratings.Add(rating);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
