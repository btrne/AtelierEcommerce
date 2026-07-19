using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Commands;

public class DeleteProductVariantCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteProductVariantCommand(int id) { Id = id; }
}

public class DeleteProductVariantCommandHandler : IRequestHandler<DeleteProductVariantCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteProductVariantCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteProductVariantCommand request, CancellationToken cancellationToken)
    {
        var variant = await _context.ProductVariants
            .Include(v => v.OrderItems)
            .Include(v => v.CartItems)
            .FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);

        if (variant == null)
            throw new Exception($"Không tìm thấy biến thể với ID = {request.Id}");

        if (variant.OrderItems.Any())
            throw new Exception($"Không thể xóa biến thể '{variant.Sku}' vì đã có đơn hàng liên quan.");

        var images = await _context.ProductVariantImages
            .Where(img => img.ProductVariantId == request.Id)
            .ToListAsync(cancellationToken);
        _context.ProductVariantImages.RemoveRange(images);

        var attributes = await _context.VariantAttributes
            .Where(va => va.ProductVariantId == request.Id)
            .ToListAsync(cancellationToken);
        _context.VariantAttributes.RemoveRange(attributes);

        _context.CartItems.RemoveRange(variant.CartItems);
        _context.ProductVariants.Remove(variant);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
