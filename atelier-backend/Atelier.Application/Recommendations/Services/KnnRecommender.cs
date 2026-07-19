using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Recommendations.Services;

public class ProductFeature
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public string? ThumbnailUrl { get; set; }
    public decimal MinPrice { get; set; }
    public string CategoryName { get; set; } = "";
    public List<int> CollectionIds { get; set; } = new();
}

public class KnnRecommender
{
    private readonly IApplicationDbContext _context;

    public KnnRecommender(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductFeature>> GetAllProductFeaturesAsync()
    {
        return await _context.Products
            .Where(p => p.IsActive)
            .Select(p => new ProductFeature
            {
                Id = p.Id,
                Name = p.Name ?? "",
                Slug = p.Slug ?? "",
                ThumbnailUrl = p.ProductVariants
                    .SelectMany(v => v.ProductVariantImages)
                    .OrderByDescending(img => img.IsPrimary)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
                MinPrice = p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : 0m,
                CategoryName = p.Category != null ? p.Category.Name ?? "" : "",
                CollectionIds = p.ProductCollections.Select(pc => pc.CollectionId).ToList(),
            })
            .ToListAsync();
    }

    public List<ProductFeature> GetSimilarProducts(List<ProductFeature> allProducts, int targetId, int k = 20)
    {
        var target = allProducts.FirstOrDefault(p => p.Id == targetId);
        if (target == null) return new List<ProductFeature>();

        var scored = allProducts
            .Where(p => p.Id != targetId)
            .Select(p => new
            {
                Product = p,
                Score = ComputeSimilarity(target, p)
            })
            .OrderByDescending(x => x.Score)
            .Take(k)
            .Select(x => x.Product)
            .ToList();

        return scored;
    }

    public List<ProductFeature> GetSimilarProductsByCollection(List<ProductFeature> allProducts, int collectionId, int k = 4)
    {
        var productsInCollection = allProducts.Where(p => p.CollectionIds.Contains(collectionId)).ToList();
        if (productsInCollection.Count == 0) return new List<ProductFeature>();

        var targetCategories = productsInCollection.Select(p => p.CategoryName).Distinct().ToList();

        var scored = allProducts
            .Where(p => !p.CollectionIds.Contains(collectionId))
            .Select(p => new
            {
                Product = p,
                Score = ComputeCollectionSimilarity(p, targetCategories, collectionId)
            })
            .OrderByDescending(x => x.Score)
            .Take(k)
            .Select(x => x.Product)
            .ToList();

        return scored;
    }

    private static double ComputeSimilarity(ProductFeature a, ProductFeature b)
    {
        double categoryScore = a.CategoryName == b.CategoryName ? 0.4 : 0.0;

        double maxPrice = Math.Max((double)a.MinPrice, (double)b.MinPrice);
        double priceDiff = Math.Abs((double)a.MinPrice - (double)b.MinPrice);
        double priceScore = maxPrice > 0 ? 0.3 * Math.Exp(-priceDiff / (maxPrice * 0.3)) : 0.3;

        var intersection = a.CollectionIds.Intersect(b.CollectionIds).Count();
        var union = a.CollectionIds.Union(b.CollectionIds).Count();
        double jaccard = union > 0 ? (double)intersection / union : 0.0;
        double collectionScore = 0.3 * jaccard;

        return categoryScore + priceScore + collectionScore;
    }

    private static double ComputeCollectionSimilarity(ProductFeature product, List<string> targetCategories, int collectionId)
    {
        double categoryScore = targetCategories.Contains(product.CategoryName) ? 0.6 : 0.0;
        return categoryScore;
    }
}
