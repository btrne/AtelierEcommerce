using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Commands;

public class UpdateProductCommand : IRequest<ProductDetailAdminDto>
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Slug { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public int? CategoryId { get; set; }
    public bool? IsFeatured { get; set; }
    public bool? IsPreorder { get; set; }
    public bool? IsActive { get; set; }
    public List<int>? CollectionIds { get; set; }
}

public class UpdateProductCommandHandler : IRequestHandler<UpdateProductCommand, ProductDetailAdminDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateProductCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductDetailAdminDto> Handle(UpdateProductCommand request, CancellationToken cancellationToken)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductCollections)
                .ThenInclude(pc => pc.Collection)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.VariantAttributes)
                    .ThenInclude(va => va.AttributeOption)
                        .ThenInclude(o => o.Attribute)
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (product == null)
            throw new Exception($"Không tìm thấy sản phẩm với ID = {request.Id}");

        if (request.Name != null)
            product.Name = request.Name;

        if (request.Slug != null)
        {
            var slugExists = await _context.Products
                .AnyAsync(p => p.Slug == request.Slug && p.Id != request.Id, cancellationToken);
            if (slugExists)
                throw new Exception($"Slug '{request.Slug}' đã tồn tại.");
            product.Slug = request.Slug;
        }

        if (request.ShortDescription != null)
            product.ShortDescription = request.ShortDescription;

        if (request.Description != null)
            product.Description = request.Description;

        if (request.CategoryId.HasValue)
        {
            var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId.Value, cancellationToken);
            if (!categoryExists)
                throw new Exception($"Danh mục với ID = {request.CategoryId} không tồn tại.");
            product.CategoryId = request.CategoryId.Value;
        }

        if (request.IsFeatured.HasValue)
            product.IsFeatured = request.IsFeatured.Value;

        if (request.IsPreorder.HasValue)
            product.IsPreorder = request.IsPreorder.Value;

        if (request.IsActive.HasValue)
            product.IsActive = request.IsActive.Value;

        if (request.CollectionIds != null)
        {
            product.ProductCollections.Clear();
            foreach (var collectionId in request.CollectionIds)
            {
                product.ProductCollections.Add(new ProductCollection
                {
                    ProductId = product.Id,
                    CollectionId = collectionId,
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new ProductDetailAdminDto
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            ShortDescription = product.ShortDescription,
            Description = product.Description,
            CategoryId = product.CategoryId,
            CategoryName = product.Category?.Name ?? "",
            IsFeatured = product.IsFeatured,
            IsPreorder = product.IsPreorder,
            IsActive = product.IsActive,
            ViewsCount = product.ViewsCount,
            CreatedAt = product.CreatedAt,
            CollectionIds = product.ProductCollections.Select(pc => pc.CollectionId).ToList(),
            CollectionNames = product.ProductCollections.Select(pc => pc.Collection?.Name ?? "").ToList(),
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
                    AttributeId = va.AttributeOption?.Attribute?.Id ?? 0,
                    AttributeName = va.AttributeOption?.Attribute?.Name ?? "",
                    OptionId = va.AttributeOptionId,
                    OptionValue = va.AttributeOption?.Value ?? "",
                }).ToList(),
            }).ToList(),
        };
    }
}
