using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Commands;

public class DeleteProductCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteProductCommand(int id) { Id = id; }
}

public class DeleteProductCommandHandler : IRequestHandler<DeleteProductCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteProductCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _context.Products
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.OrderItems)
            .Include(p => p.Wishlists)
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (product == null)
            throw new Exception($"Không tìm thấy sản phẩm với ID = {request.Id}");

        var hasOrders = product.ProductVariants.Any(v => v.OrderItems.Any());
        if (hasOrders)
            throw new Exception($"Không thể xóa sản phẩm '{product.Name}' vì đã có đơn hàng liên quan. Hãy tắt sản phẩm (IsActive = false) thay vì xóa.");

        var variantIds = product.ProductVariants.Select(v => v.Id).ToList();

        var variantImages = await _context.ProductVariantImages
            .Where(img => variantIds.Contains(img.ProductVariantId))
            .ToListAsync(cancellationToken);
        _context.ProductVariantImages.RemoveRange(variantImages);

        var variantAttributes = await _context.VariantAttributes
            .Where(va => variantIds.Contains(va.ProductVariantId))
            .ToListAsync(cancellationToken);
        _context.VariantAttributes.RemoveRange(variantAttributes);

        var cartItems = await _context.CartItems
            .Where(ci => variantIds.Contains(ci.ProductVariantId))
            .ToListAsync(cancellationToken);
        _context.CartItems.RemoveRange(cartItems);

        _context.ProductVariants.RemoveRange(product.ProductVariants);
        _context.Products.Remove(product);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
