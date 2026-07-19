using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Queries;

public class GetAllProductsAdminQuery : IRequest<PaginatedList<ProductAdminDto>>
{
    public bool? IsActive { get; set; }
    public bool? IsFeatured { get; set; }
    public int? CategoryId { get; set; }
    public string? Search { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllProductsAdminQueryHandler : IRequestHandler<GetAllProductsAdminQuery, PaginatedList<ProductAdminDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllProductsAdminQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ProductAdminDto>> Handle(GetAllProductsAdminQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(p => p.IsActive == request.IsActive.Value);

        if (request.IsFeatured.HasValue)
            query = query.Where(p => p.IsFeatured == request.IsFeatured.Value);

        if (request.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(p => p.Name.Contains(request.Search) || (p.Slug != null && p.Slug.Contains(request.Search)));

        var totalCount = await query.CountAsync(cancellationToken);

        var products = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new ProductAdminDto
            {
                Id = p.Id,
                Name = p.Name ?? "",
                Slug = p.Slug,
                ShortDescription = p.ShortDescription,
                CategoryName = p.Category != null ? p.Category.Name ?? "" : "Chưa phân loại",
                CategoryId = p.CategoryId,
                MinPrice = p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : 0m,
                TotalStock = p.ProductVariants.Sum(v => v.Quantity),
                VariantCount = p.ProductVariants.Count,
                ThumbnailUrl = p.ProductVariants
                    .SelectMany(v => v.ProductVariantImages)
                    .OrderByDescending(img => img.IsPrimary == true)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
                IsFeatured = p.IsFeatured,
                IsPreorder = p.IsPreorder,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<ProductAdminDto>(products, totalCount, request.Page, request.PageSize);
    }
}
