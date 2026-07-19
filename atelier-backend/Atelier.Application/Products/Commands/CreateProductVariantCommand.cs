using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Commands;

public class CreateProductVariantCommand : IRequest<ProductVariantAdminDto>
{
    public int ProductId { get; set; }
    public string Sku { get; set; } = null!;
    public decimal Price { get; set; }
    public int Quantity { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; } = true;
    public string? ImageUrl { get; set; }
    public List<int>? AttributeOptionIds { get; set; }
}

public class CreateProductVariantCommandHandler : IRequestHandler<CreateProductVariantCommand, ProductVariantAdminDto>
{
    private readonly IApplicationDbContext _context;

    public CreateProductVariantCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductVariantAdminDto> Handle(CreateProductVariantCommand request, CancellationToken cancellationToken)
    {
        var productExists = await _context.Products.AnyAsync(p => p.Id == request.ProductId, cancellationToken);
        if (!productExists)
            throw new Exception($"Sản phẩm với ID = {request.ProductId} không tồn tại.");

        var skuExists = await _context.ProductVariants
            .AnyAsync(v => v.Sku == request.Sku && v.ProductId == request.ProductId, cancellationToken);
        if (skuExists)
            throw new Exception($"SKU '{request.Sku}' đã tồn tại trong sản phẩm này.");

        if (request.IsDefault)
        {
            var existingDefault = await _context.ProductVariants
                .Where(v => v.ProductId == request.ProductId && v.IsDefault)
                .ToListAsync(cancellationToken);
            foreach (var v in existingDefault)
                v.IsDefault = false;
        }

        var variant = new ProductVariant
        {
            ProductId = request.ProductId,
            Sku = request.Sku,
            Price = request.Price,
            Quantity = request.Quantity,
            IsDefault = request.IsDefault,
            IsActive = request.IsActive,
        };

        _context.ProductVariants.Add(variant);
        await _context.SaveChangesAsync(cancellationToken);

        if (request.AttributeOptionIds != null)
        {
            foreach (var optionId in request.AttributeOptionIds)
            {
                _context.VariantAttributes.Add(new VariantAttribute
                {
                    ProductVariantId = variant.Id,
                    AttributeOptionId = optionId,
                });
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (request.ImageUrl != null)
        {
            var image = new ProductVariantImage
            {
                ProductVariantId = variant.Id,
                ImageUrl = request.ImageUrl,
                IsPrimary = true,
            };
            _context.ProductVariantImages.Add(image);
            await _context.SaveChangesAsync(cancellationToken);
        }

        var attributes = await _context.VariantAttributes
            .Where(va => va.ProductVariantId == variant.Id)
            .Include(va => va.AttributeOption)
                .ThenInclude(o => o.Attribute)
            .ToListAsync(cancellationToken);

        return new ProductVariantAdminDto
        {
            Id = variant.Id,
            Sku = variant.Sku ?? "",
            Price = variant.Price,
            Quantity = variant.Quantity,
            IsDefault = variant.IsDefault,
            IsActive = variant.IsActive,
            ThumbnailUrl = request.ImageUrl,
            Attributes = attributes.Select(va => new VariantAttributeDto
            {
                AttributeId = va.AttributeOption.Attribute.Id,
                AttributeName = va.AttributeOption.Attribute.Name ?? "",
                OptionId = va.AttributeOptionId,
                OptionValue = va.AttributeOption.Value ?? "",
            }).ToList(),
        };
    }
}
