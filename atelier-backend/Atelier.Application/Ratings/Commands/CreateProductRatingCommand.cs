using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Ratings.Commands;

public class CreateProductRatingCommand : IRequest<bool>
{
    public int ProductId { get; set; }
    public int UserId { get; set; }
    public int Stars { get; set; }
    public string? Comment { get; set; }
}

public class CreateProductRatingCommandHandler : IRequestHandler<CreateProductRatingCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CreateProductRatingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(CreateProductRatingCommand request, CancellationToken cancellationToken)
    {
        if (request.Stars < 1 || request.Stars > 5)
            throw new Exception("Số sao phải từ 1 đến 5.");

        // Find the first completed order item for this product and user
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

        if (orderItem == null)
            throw new Exception("Không tìm thấy sản phẩm nào đã mua và hoàn thành để đánh giá, hoặc bạn đã đánh giá sản phẩm này rồi.");

        var rating = new Rating
        {
            OrderItemId = orderItem.Id,
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