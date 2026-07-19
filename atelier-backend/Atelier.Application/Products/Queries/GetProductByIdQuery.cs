using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Queries;

public class GetProductByIdQuery : IRequest<ProductDetailDto?>
{
    public int Id { get; set; }
    public GetProductByIdQuery(int id) { Id = id; }
}

public class GetProductByIdQueryHandler : IRequestHandler<GetProductByIdQuery, ProductDetailDto?>
{
    private readonly IApplicationDbContext _context;

    public GetProductByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductDetailDto?> Handle(GetProductByIdQuery request, CancellationToken cancellationToken)
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
            .FirstOrDefaultAsync(p => p.Id == request.Id && p.IsActive, cancellationToken);

        if (product == null) return null;

        return new ProductDetailDto
        {
            Id = product.Id,
            Name = product.Name ?? "",
            Slug = product.Slug ?? "",
            ShortDescription = product.ShortDescription,
            Description = product.Description,
            Story = product.Story,
            CategoryName = product.Category != null ? (product.Category.Name ?? "") : "Chưa phân loại",
            CollectionId = product.ProductCollections
                .Select(pc => (int?)pc.Collection.Id)
                .FirstOrDefault(),
            CollectionName = product.ProductCollections
                .Select(pc => pc.Collection.Name)
                .FirstOrDefault(),
            CollectionSlug = product.ProductCollections
                .Select(pc => pc.Collection.Slug)
                .FirstOrDefault(),
            Variants = product.ProductVariants.Select(v => new VariantDto
            {
                Id = v.Id,
                Sku = v.Sku ?? "",
                Price = v.Price,
                Weight = v.Weight,
                StockQuantity = v.Quantity,
                ThumbnailUrl = v.ProductVariantImages
                    .OrderByDescending(img => img.IsPrimary == true)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
                Images = v.ProductVariantImages
                    .OrderByDescending(img => img.IsPrimary == true)
                    .Select(img => img.ImageUrl)
                    .ToList(),
                Attributes = v.VariantAttributes.Select(va => new VariantAttributeDto
                {
                    AttributeId = va.AttributeOption.Attribute.Id,
                    AttributeName = va.AttributeOption.Attribute.Name ?? "",
                    OptionId = va.AttributeOptionId,
                    OptionValue = va.AttributeOption.Value ?? "",
                }).ToList()
            }).ToList()
        };
    }
}
