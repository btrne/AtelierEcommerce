using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Commands;

public class UpdateProductVariantCommand : IRequest<ProductVariantAdminDto>
{
    public int Id { get; set; }
    public string? Sku { get; set; }
    public decimal? Price { get; set; }
    public int? Quantity { get; set; }
    public bool? IsDefault { get; set; }
    public bool? IsActive { get; set; }
    public string? ImageUrl { get; set; }
    public List<int>? AttributeOptionIds { get; set; }
}

public class UpdateProductVariantCommandHandler : IRequestHandler<UpdateProductVariantCommand, ProductVariantAdminDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateProductVariantCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductVariantAdminDto> Handle(UpdateProductVariantCommand request, CancellationToken cancellationToken)
    {
        var variant = await _context.ProductVariants
            .Include(v => v.ProductVariantImages)
            .Include(v => v.VariantAttributes)
                .ThenInclude(va => va.AttributeOption)
                    .ThenInclude(o => o.Attribute)
            .FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);

        if (variant == null)
            throw new Exception($"Không tìm thấy biến thể với ID = {request.Id}");

        if (request.Sku != null)
        {
            var skuExists = await _context.ProductVariants
                .AnyAsync(v => v.Sku == request.Sku && v.ProductId == variant.ProductId && v.Id != request.Id, cancellationToken);
            if (skuExists)
                throw new Exception($"SKU '{request.Sku}' đã tồn tại.");
            variant.Sku = request.Sku;
        }

        if (request.Price.HasValue)
            variant.Price = request.Price.Value;

        if (request.Quantity.HasValue)
            variant.Quantity = request.Quantity.Value;

        if (request.IsDefault.HasValue && request.IsDefault.Value)
        {
            var existingDefault = await _context.ProductVariants
                .Where(v => v.ProductId == variant.ProductId && v.IsDefault && v.Id != request.Id)
                .ToListAsync(cancellationToken);
            foreach (var v in existingDefault)
                v.IsDefault = false;
            variant.IsDefault = true;
        }

        if (request.IsActive.HasValue)
            variant.IsActive = request.IsActive.Value;

        if (request.AttributeOptionIds != null)
        {
            variant.VariantAttributes.Clear();
            foreach (var optionId in request.AttributeOptionIds)
            {
                variant.VariantAttributes.Add(new VariantAttribute
                {
                    ProductVariantId = variant.Id,
                    AttributeOptionId = optionId,
                });
            }
        }

        if (request.ImageUrl != null)
        {
            var existingPrimary = variant.ProductVariantImages.FirstOrDefault(img => img.IsPrimary == true);
            if (existingPrimary != null)
                existingPrimary.ImageUrl = request.ImageUrl;
            else
            {
                variant.ProductVariantImages.Add(new ProductVariantImage
                {
                    ProductVariantId = variant.Id,
                    ImageUrl = request.ImageUrl,
                    IsPrimary = true,
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        // Reload variant from DB to get fresh navigation properties
        variant = await _context.ProductVariants
            .Include(v => v.ProductVariantImages)
            .Include(v => v.VariantAttributes)
                .ThenInclude(va => va.AttributeOption)
                    .ThenInclude(o => o.Attribute)
            .FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);

        if (variant == null)
            throw new Exception($"Không tìm thấy biến thể với ID = {request.Id}");

        return new ProductVariantAdminDto
        {
            Id = variant.Id,
            Sku = variant.Sku ?? "",
            Price = variant.Price,
            Quantity = variant.Quantity,
            IsDefault = variant.IsDefault,
            IsActive = variant.IsActive,
            ThumbnailUrl = variant.ProductVariantImages
                .OrderByDescending(img => img.IsPrimary == true)
                .Select(img => img.ImageUrl)
                .FirstOrDefault(),
            Images = variant.ProductVariantImages
                .OrderByDescending(img => img.IsPrimary == true)
                .Select(img => new ProductVariantImageDto
                {
                    Id = img.Id,
                    ImageUrl = img.ImageUrl,
                    IsPrimary = img.IsPrimary == true,
                })
                .ToList(),
            Attributes = variant.VariantAttributes.Select(va => new VariantAttributeDto
            {
                AttributeId = va.AttributeOption.Attribute.Id,
                AttributeName = va.AttributeOption.Attribute.Name ?? "",
                OptionId = va.AttributeOptionId,
                OptionValue = va.AttributeOption.Value ?? "",
            }).ToList(),
        };
    }
}
