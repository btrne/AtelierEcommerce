using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Recommendations.Queries;

public class CollectionRecommendationDto
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string? Slug { get; set; }
    public string? BannerImageUrl { get; set; }
    public int ProductCount { get; set; }
}

public class GetCollectionRecommendationsQuery : IRequest<List<CollectionRecommendationDto>>
{
    public int CollectionId { get; set; }
    public int Take { get; set; } = 4;
}

public class GetCollectionRecommendationsQueryHandler
    : IRequestHandler<GetCollectionRecommendationsQuery, List<CollectionRecommendationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCollectionRecommendationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CollectionRecommendationDto>> Handle(
        GetCollectionRecommendationsQuery request, CancellationToken cancellationToken)
    {
        var targetCollection = await _context.Collections
            .Include(c => c.ProductCollections)
            .FirstOrDefaultAsync(c => c.Id == request.CollectionId, cancellationToken);

        if (targetCollection == null) return new List<CollectionRecommendationDto>();

        var targetCategoryIds = await _context.ProductCollections
            .Where(pc => pc.CollectionId == request.CollectionId)
            .Join(_context.Products,
                pc => pc.ProductId,
                p => p.Id,
                (pc, p) => p.CategoryId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var allCollections = await _context.Collections
            .Where(c => c.IsActive && c.Id != request.CollectionId)
            .Include(c => c.ProductCollections)
            .ThenInclude(pc => pc.Product)
            .ToListAsync(cancellationToken);

        var scored = allCollections
            .Select(c =>
            {
                var catIds = c.ProductCollections
                    .Where(pc => pc.Product != null)
                    .Select(pc => pc.Product.CategoryId)
                    .Distinct()
                    .ToList();

                var overlap = catIds.Intersect(targetCategoryIds).Count();
                var union = catIds.Union(targetCategoryIds).Count();
                var jaccard = union > 0 ? (double)overlap / union : 0.0;

                return new
                {
                    Collection = c,
                    Score = jaccard
                };
            })
            .Where(x => x.Score > 0)
            .OrderByDescending(x => x.Score)
            .Take(request.Take)
            .ToList();

        return scored.Select(x => new CollectionRecommendationDto
        {
            Id = x.Collection.Id,
            Name = x.Collection.Name ?? "",
            Slug = x.Collection.Slug,
            BannerImageUrl = x.Collection.BannerImageUrl,
            ProductCount = x.Collection.ProductCollections.Count,
        }).ToList();
    }
}
