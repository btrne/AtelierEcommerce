using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Commands;

public class AddVariantImageCommand : IRequest<bool>
{
    public int ProductVariantId { get; set; }
    public string ImageUrl { get; set; } = null!;
    public bool? IsPrimary { get; set; }
}

public class AddVariantImageCommandHandler : IRequestHandler<AddVariantImageCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public AddVariantImageCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(AddVariantImageCommand request, CancellationToken cancellationToken)
    {
        var variantExists = await _context.ProductVariants
            .AnyAsync(v => v.Id == request.ProductVariantId, cancellationToken);
        if (!variantExists)
            throw new Exception($"Biến thể với ID = {request.ProductVariantId} không tồn tại.");

        if (request.IsPrimary == true)
        {
            var existingPrimary = await _context.ProductVariantImages
                .Where(img => img.ProductVariantId == request.ProductVariantId && img.IsPrimary == true)
                .ToListAsync(cancellationToken);
            foreach (var img in existingPrimary)
                img.IsPrimary = false;
        }

        var image = new ProductVariantImage
        {
            ProductVariantId = request.ProductVariantId,
            ImageUrl = request.ImageUrl,
            IsPrimary = request.IsPrimary ?? false,
        };

        _context.ProductVariantImages.Add(image);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class DeleteVariantImageCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteVariantImageCommand(int id) { Id = id; }
}

public class DeleteVariantImageCommandHandler : IRequestHandler<DeleteVariantImageCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteVariantImageCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteVariantImageCommand request, CancellationToken cancellationToken)
    {
        var image = await _context.ProductVariantImages
            .FirstOrDefaultAsync(img => img.Id == request.Id, cancellationToken);

        if (image == null)
            throw new Exception($"Không tìm thấy hình ảnh với ID = {request.Id}");

        _context.ProductVariantImages.Remove(image);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class SetPrimaryImageCommand : IRequest<bool>
{
    public int Id { get; set; }
    public int ProductVariantId { get; set; }
}

public class SetPrimaryImageCommandHandler : IRequestHandler<SetPrimaryImageCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public SetPrimaryImageCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(SetPrimaryImageCommand request, CancellationToken cancellationToken)
    {
        var image = await _context.ProductVariantImages
            .FirstOrDefaultAsync(img => img.Id == request.Id, cancellationToken);
        if (image == null)
            throw new Exception($"Không tìm thấy hình ảnh với ID = {request.Id}");

        var existingPrimary = await _context.ProductVariantImages
            .Where(img => img.ProductVariantId == request.ProductVariantId && img.IsPrimary == true && img.Id != request.Id)
            .ToListAsync(cancellationToken);
        foreach (var img in existingPrimary)
            img.IsPrimary = false;

        image.IsPrimary = true;
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
