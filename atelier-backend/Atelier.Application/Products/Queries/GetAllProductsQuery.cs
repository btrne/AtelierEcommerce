using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Products.Queries;

public class GetAllProductsQuery : IRequest<List<ProductDto>>
{
    public bool? IsFeatured { get; set; }
    public bool? IsActive { get; set; }
    public int? CategoryId { get; set; }
    public List<int>? CategoryIds { get; set; }
    public int? CollectionId { get; set; }
    public List<int>? CollectionIds { get; set; }
    public string? Search { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public decimal? MinRating { get; set; }
    public bool? IsPreorder { get; set; }
    public bool? InStock { get; set; }
    public List<int>? AttributeOptionIds { get; set; }
    public string? SortBy { get; set; }
    public int? Page { get; set; }
    public int? PageSize { get; set; }
}

public class GetAllProductsQueryHandler : IRequestHandler<GetAllProductsQuery, List<ProductDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllProductsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> Handle(GetAllProductsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.VariantAttributes)
            .Include(p => p.ProductCollections)
                .ThenInclude(pc => pc.Collection)
            .AsQueryable();

        if (request.IsFeatured.HasValue)
            query = query.Where(p => p.IsFeatured == request.IsFeatured.Value);

        if (request.IsActive.HasValue)
            query = query.Where(p => p.IsActive == request.IsActive.Value);
        else
            query = query.Where(p => p.IsActive);

        if (request.CategoryId.HasValue)
            query = query.Where(p => p.CategoryId == request.CategoryId.Value);

        if (request.CategoryIds is { Count: > 0 })
            query = query.Where(p => request.CategoryIds.Contains(p.CategoryId));

        if (request.CollectionId.HasValue)
            query = query.Where(p => p.ProductCollections.Any(pc => pc.CollectionId == request.CollectionId.Value));

        if (request.CollectionIds is { Count: > 0 })
            query = query.Where(p => p.ProductCollections.Any(pc => request.CollectionIds.Contains(pc.CollectionId)));

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(p =>
                (p.Name != null && p.Name.ToLower().Contains(search)) ||
                (p.Description != null && p.Description.ToLower().Contains(search)) ||
                (p.ShortDescription != null && p.ShortDescription.ToLower().Contains(search)));
        }

        if (request.MinPrice.HasValue)
            query = query.Where(p => p.ProductVariants.Any(v => v.Price >= request.MinPrice.Value));

        if (request.MaxPrice.HasValue)
            query = query.Where(p => p.ProductVariants.Any(v => v.Price <= request.MaxPrice.Value));

        if (request.MinRating.HasValue)
            query = query.Where(p =>
                p.ProductVariants
                    .SelectMany(v => v.OrderItems)
                    .Where(oi => oi.Rating != null)
                    .Average(oi => (double?)oi.Rating.Stars) >= (double)request.MinRating.Value);

        if (request.IsPreorder.HasValue)
            query = query.Where(p => p.IsPreorder == request.IsPreorder.Value);

        if (request.InStock.HasValue && request.InStock.Value)
            query = query.Where(p => p.ProductVariants.Any(v => v.Quantity > 0));

        if (request.AttributeOptionIds is { Count: > 0 })
        {
            foreach (var optionId in request.AttributeOptionIds)
            {
                var id = optionId;
                query = query.Where(p => p.ProductVariants
                    .Any(v => v.VariantAttributes.Any(va => va.AttributeOptionId == id)));
            }
        }

        var products = query
            .Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name ?? "",
                Slug = p.Slug ?? "",
                Description = p.Description,
                ShortDescription = p.ShortDescription,
                CategoryName = p.Category != null ? (p.Category.Name ?? "Chưa phân loại") : "Chưa phân loại",
                CategoryId = p.CategoryId,
                MinPrice = p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : 0m,
                MaxPrice = p.ProductVariants.Any() ? p.ProductVariants.Max(v => v.Price) : 0m,
                ThumbnailUrl = p.ProductVariants
                    .Where(v => v.IsDefault == true)
                    .SelectMany(v => v.ProductVariantImages)
                    .OrderByDescending(img => img.IsPrimary == true)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault()
                    ?? p.ProductVariants
                        .SelectMany(v => v.ProductVariantImages)
                        .OrderByDescending(img => img.IsPrimary == true)
                        .Select(img => img.ImageUrl)
                        .FirstOrDefault(),
                IsFeatured = p.IsFeatured,
                IsPreorder = p.IsPreorder,
                IsInStock = p.ProductVariants.Any(v => v.Quantity > 0),
                TotalSold = p.ProductVariants
                    .SelectMany(v => v.OrderItems)
                    .Where(oi => oi.Order != null && oi.Order.OrderStatus != "Cancelled")
                    .Sum(oi => oi.Quantity),
                ViewsCount = p.ViewsCount,
                RatingAverage = p.ProductVariants
                    .SelectMany(v => v.OrderItems)
                    .Where(oi => oi.Rating != null)
                    .Select(oi => (decimal?)oi.Rating.Stars)
                    .DefaultIfEmpty()
                    .Average() ?? 0m,
                CollectionNames = p.ProductCollections.Select(pc => pc.Collection.Name).ToList(),
                CollectionIds = p.ProductCollections.Select(pc => pc.CollectionId).ToList(),
            });

        products = (request.SortBy?.ToLower()) switch
        {
            "price_asc" => products.OrderBy(p => p.MinPrice),
            "price_desc" => products.OrderByDescending(p => p.MinPrice),
            "best_selling" => products.OrderByDescending(p => p.TotalSold),
            "most_viewed" => products.OrderByDescending(p => p.ViewsCount),
            "rating" => products.OrderByDescending(p => p.RatingAverage),
            "name_asc" => products.OrderBy(p => p.Name),
            _ => products.OrderByDescending(p => p.Id),
        };

        var result = await products.ToListAsync(cancellationToken);

        if (request.Page.HasValue && request.PageSize.HasValue)
        {
            result = result
                .Skip((request.Page.Value - 1) * request.PageSize.Value)
                .Take(request.PageSize.Value)
                .ToList();
        }

        return result;
    }
}
