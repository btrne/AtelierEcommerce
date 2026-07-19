using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Queries;

public class GetProductAdminByIdQuery : IRequest<ProductDetailAdminDto?>
{
    public int Id { get; set; }
    public GetProductAdminByIdQuery(int id) { Id = id; }
}

public class GetProductAdminByIdQueryHandler : IRequestHandler<GetProductAdminByIdQuery, ProductDetailAdminDto?>
{
    private readonly IApplicationDbContext _context;

    public GetProductAdminByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductDetailAdminDto?> Handle(GetProductAdminByIdQuery request, CancellationToken cancellationToken)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.VariantAttributes)
                    .ThenInclude(va => va.AttributeOption)
                        .ThenInclude(o => o.Attribute)
            .Include(p => p.ProductCollections)
                .ThenInclude(pc => pc.Collection)
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (product == null) return null;

        return new ProductDetailAdminDto
        {
            Id = product.Id,
            Name = product.Name ?? "",
            Slug = product.Slug,
            ShortDescription = product.ShortDescription,
            Description = product.Description,
            CategoryId = product.CategoryId,
            CategoryName = product.Category?.Name ?? "Chưa phân loại",
            IsFeatured = product.IsFeatured,
            IsPreorder = product.IsPreorder,
            IsActive = product.IsActive,
            ViewsCount = product.ViewsCount,
            CreatedAt = product.CreatedAt,
            CollectionIds = product.ProductCollections.Select(pc => pc.CollectionId).ToList(),
            CollectionNames = product.ProductCollections.Select(pc => pc.Collection.Name ?? "").ToList(),
            Variants = product.ProductVariants.Select(v => new ProductVariantAdminDto
            {
                Id = v.Id,
                Sku = v.Sku ?? "",
                Price = v.Price,
                Quantity = v.Quantity,
                IsDefault = v.IsDefault,
                IsActive = v.IsActive,
                ThumbnailUrl = v.ProductVariantImages
                    .OrderByDescending(img => img.IsPrimary == true)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
                Images = v.ProductVariantImages
                    .OrderByDescending(img => img.IsPrimary == true)
                    .Select(img => new ProductVariantImageDto
                    {
                        Id = img.Id,
                        ImageUrl = img.ImageUrl,
                        IsPrimary = img.IsPrimary == true,
                    })
                    .ToList(),
                Attributes = v.VariantAttributes.Select(va => new VariantAttributeDto
                {
                    AttributeId = va.AttributeOption.Attribute.Id,
                    AttributeName = va.AttributeOption.Attribute.Name ?? "",
                    OptionId = va.AttributeOptionId,
                    OptionValue = va.AttributeOption.Value ?? "",
                }).ToList(),
            }).ToList(),
        };
    }
}
