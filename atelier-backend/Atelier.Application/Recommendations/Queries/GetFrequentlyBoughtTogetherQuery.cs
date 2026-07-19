using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Recommendations.Queries;

public class GetFrequentlyBoughtTogetherQuery : IRequest<List<ProductDto>>
{
    public int ProductId { get; set; }
    public int Take { get; set; } = 5;
}

public class GetFrequentlyBoughtTogetherQueryHandler
    : IRequestHandler<GetFrequentlyBoughtTogetherQuery, List<ProductDto>>
{
    private readonly IApplicationDbContext _context;

    public GetFrequentlyBoughtTogetherQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductDto>> Handle(GetFrequentlyBoughtTogetherQuery request, CancellationToken cancellationToken)
    {
        var recommendedIds = await _context.ProductAssociationRules
            .Where(r => r.SourceProductId == request.ProductId)
            .OrderByDescending(r => r.Confidence)
            .ThenByDescending(r => r.Lift)
            .Take(request.Take)
            .Select(r => r.RecommendedProductId)
            .ToListAsync(cancellationToken);

        if (recommendedIds.Count == 0) return new List<ProductDto>();

        var products = await _context.Products
            .Where(p => recommendedIds.Contains(p.Id))
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
                Description = p.Description,
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
            })
            .ToListAsync(cancellationToken);

        var ordered = recommendedIds
            .Select(id => products.FirstOrDefault(p => p.Id == id))
            .Where(p => p != null)
            .Select(p => p!)
            .ToList();

        return ordered;
    }
}
