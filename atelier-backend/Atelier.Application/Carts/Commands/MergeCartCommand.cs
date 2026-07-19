using MediatR;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;

namespace Atelier.Application.Carts.Commands;

public class MergeCartCommand : IRequest
{
    public int UserId { get; set; }
    public List<CartItemInput> Items { get; set; } = new();
    public string? SessionId { get; set; }
}

public class CartItemInput
{
    public int ProductVariantId { get; set; }
    public int Quantity { get; set; }
}

public class MergeCartCommandHandler : IRequestHandler<MergeCartCommand>
{
    private readonly IApplicationDbContext _context;

    public MergeCartCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(MergeCartCommand request, CancellationToken cancellationToken)
    {
        var cart = await _context.Carts
            .Include(c => c.CartItems)
            .FirstOrDefaultAsync(c => c.UserId == request.UserId, cancellationToken);

        if (cart == null)
        {
            cart = new Cart { UserId = request.UserId };
            _context.Carts.Add(cart);
            await _context.SaveChangesAsync(cancellationToken);
        }

        // Nếu có SessionId, tìm giỏ hàng session và hợp nhất
        if (!string.IsNullOrEmpty(request.SessionId))
        {
            var sessionCart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => c.SessionId == request.SessionId, cancellationToken);

            if (sessionCart != null)
            {
                foreach (var sessionItem in sessionCart.CartItems)
                {
                    var existing = cart.CartItems
                        .FirstOrDefault(i => i.ProductVariantId == sessionItem.ProductVariantId);

                    if (existing != null)
                    {
                        existing.Quantity += sessionItem.Quantity;
                    }
                    else
                    {
                        cart.CartItems.Add(new CartItem
                        {
                            CartId = cart.Id,
                            ProductVariantId = sessionItem.ProductVariantId,
                            Quantity = sessionItem.Quantity,
                        });
                    }
                }

                // Xóa giỏ hàng session sau khi đã hợp nhất
                _context.Carts.Remove(sessionCart);
            }
        }

        // Hợp nhất các items từ request (localStorage)
        foreach (var input in request.Items)
        {
            if (input.Quantity <= 0) continue;

            var existing = cart.CartItems
                .FirstOrDefault(i => i.ProductVariantId == input.ProductVariantId);

            if (existing != null)
            {
                existing.Quantity += input.Quantity;
            }
            else
            {
                cart.CartItems.Add(new CartItem
                {
                    CartId = cart.Id,
                    ProductVariantId = input.ProductVariantId,
                    Quantity = input.Quantity,
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
