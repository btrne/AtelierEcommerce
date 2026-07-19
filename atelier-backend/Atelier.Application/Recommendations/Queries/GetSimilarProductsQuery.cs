using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Application.Recommendations.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Recommendations.Queries;

public class GetSimilarProductsQuery : IRequest<List<ProductDto>>
{
    public int ProductId { get; set; }
    public int Take { get; set; } = 20;
}

public class GetSimilarProductsQueryHandler : IRequestHandler<GetSimilarProductsQuery, List<ProductDto>>
{
    private readonly KnnRecommender _recommender;
    private readonly IApplicationDbContext _context;

    public GetSimilarProductsQueryHandler(KnnRecommender recommender, IApplicationDbContext context)
    {
        _recommender = recommender;
        _context = context;
    }

    public async Task<List<ProductDto>> Handle(GetSimilarProductsQuery request, CancellationToken cancellationToken)
    {
        var allFeatures = await _recommender.GetAllProductFeaturesAsync();
        var similar = _recommender.GetSimilarProducts(allFeatures, request.ProductId, request.Take);

        var ids = similar.Select(p => p.Id).ToList();
        if (ids.Count == 0) return new List<ProductDto>();

        var products = await _context.Products
            .Where(p => ids.Contains(p.Id))
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .Include(p => p.ProductCollections)
                .ThenInclude(pc => pc.Collection)
            .Select(p => new ProductDto
            {
                Id = p.Id,
                Name = p.Name ?? "",
                Slug = p.Slug ?? "",
                ShortDescription = p.ShortDescription,
                CategoryName = p.Category != null ? (p.Category.Name ?? "Chưa phân loại") : "Chưa phân loại",
                MinPrice = p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : 0m,
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
                CollectionNames = p.ProductCollections.Select(pc => pc.Collection.Name).ToList(),
            })
            .ToListAsync(cancellationToken);

        // Preserve KNN ordering
        var ordered = ids
            .Select(id => products.FirstOrDefault(p => p.Id == id))
            .Where(p => p != null)
            .Select(p => p!)
            .ToList();

        return ordered;
    }
}
