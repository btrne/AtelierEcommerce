using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Carts.Commands;

public class UpdateCartItemCommand : IRequest<bool>
{
    public int CartItemId { get; set; }
    public int Quantity { get; set; }
    public int? UserId { get; set; }
    public string? SessionId { get; set; }
}

public class UpdateCartItemCommandHandler : IRequestHandler<UpdateCartItemCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateCartItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateCartItemCommand request, CancellationToken cancellationToken)
    {
        var item = await _context.CartItems
            .Include(ci => ci.Cart)
            .FirstOrDefaultAsync(ci => ci.Id == request.CartItemId, cancellationToken);

        if (item == null)
            throw new Exception("Không tìm thấy sản phẩm trong giỏ hàng.");

        var ownsItem =
            (request.UserId.HasValue && item.Cart.UserId == request.UserId.Value) ||
            (!request.UserId.HasValue &&
             !string.IsNullOrWhiteSpace(request.SessionId) &&
             item.Cart.SessionId == request.SessionId);

        if (!ownsItem)
            throw new UnauthorizedAccessException("Cart item does not belong to the current user.");

        if (request.Quantity <= 0)
        {
            _context.CartItems.Remove(item);
        }
        else
        {
            item.Quantity = request.Quantity;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
