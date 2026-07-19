using MediatR;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;

namespace Atelier.Application.Carts.Commands
{
    public class AddToCartCommandHandler : IRequestHandler<AddToCartCommand, int>
    {
        private readonly IApplicationDbContext _context;

        public AddToCartCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<int> Handle(AddToCartCommand request, CancellationToken cancellationToken)
        {
            // 1. Tìm giỏ hàng hiện có
            var cart = await _context.Carts
                .Include(c => c.CartItems)
                .FirstOrDefaultAsync(c => 
                    (request.UserId.HasValue && c.UserId == request.UserId) || 
                    (!string.IsNullOrEmpty(request.SessionId) && c.SessionId == request.SessionId), 
                    cancellationToken);

            // 2. Nếu chưa có giỏ hàng, tạo mới
            if (cart == null)
            {
                cart = new Cart
                {
                    UserId = request.UserId,
                    SessionId = request.SessionId,
                };
                _context.Carts.Add(cart);
                await _context.SaveChangesAsync(cancellationToken);
            }

            // 3. Xử lý Cart Item
            var existingItem = cart.CartItems
                .FirstOrDefault(i => i.ProductVariantId == request.ProductVariantId);

            if (existingItem != null)
            {
                // Nếu túi đã có trong giỏ, cộng dồn số lượng
                existingItem.Quantity += request.Quantity;
            }
            else
            {
                // Nếu chưa có, thêm mới item vào giỏ
                var newItem = new CartItem
                {
                    CartId = cart.Id,
                    ProductVariantId = request.ProductVariantId,
                    Quantity = request.Quantity
                };
                _context.CartItems.Add(newItem);
            }

            await _context.SaveChangesAsync(cancellationToken);

            return cart.Id; // Trả về ID của giỏ hàng
        }
    }
}