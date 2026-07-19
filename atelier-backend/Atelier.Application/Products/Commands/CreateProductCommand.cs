using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Commands;

public class CreateProductCommand : IRequest<ProductDetailAdminDto>
{
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public int CategoryId { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPreorder { get; set; }
    public bool IsActive { get; set; } = true;
    public List<int>? CollectionIds { get; set; }
}

public class CreateProductCommandHandler : IRequestHandler<CreateProductCommand, ProductDetailAdminDto>
{
    private readonly IApplicationDbContext _context;

    public CreateProductCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductDetailAdminDto> Handle(CreateProductCommand request, CancellationToken cancellationToken)
    {
        var slug = request.Slug ?? request.Name.ToLower().Replace(" ", "-");

        var slugExists = await _context.Products.AnyAsync(p => p.Slug == slug, cancellationToken);
        if (slugExists)
            throw new Exception($"Slug '{slug}' đã tồn tại.");

        var categoryExists = await _context.Categories.AnyAsync(c => c.Id == request.CategoryId, cancellationToken);
        if (!categoryExists)
            throw new Exception($"Danh mục với ID = {request.CategoryId} không tồn tại.");

        var product = new Product
        {
            Name = request.Name,
            Slug = slug,
            ShortDescription = request.ShortDescription,
            Description = request.Description,
            CategoryId = request.CategoryId,
            IsFeatured = request.IsFeatured,
            IsPreorder = request.IsPreorder,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
        };

        if (request.CollectionIds != null && request.CollectionIds.Any())
        {
            foreach (var collectionId in request.CollectionIds)
            {
                product.ProductCollections.Add(new ProductCollection
                {
                    ProductId = product.Id,
                    CollectionId = collectionId,
                });
            }
        }

        _context.Products.Add(product);
        await _context.SaveChangesAsync(cancellationToken);

        return new ProductDetailAdminDto
        {
            Id = product.Id,
            Name = product.Name,
            Slug = product.Slug,
            ShortDescription = product.ShortDescription,
            Description = product.Description,
            CategoryId = product.CategoryId,
            IsFeatured = product.IsFeatured,
            IsPreorder = product.IsPreorder,
            IsActive = product.IsActive,
            CreatedAt = product.CreatedAt,
            CollectionIds = request.CollectionIds ?? new(),
        };
    }
}
