using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Collections.Queries;

public class GetBestSellingCollectionsQuery : IRequest<List<CollectionAdminDto>>
{
    public int Count { get; set; } = 3;
    public bool IncludeInactive { get; set; }
}

public class GetBestSellingCollectionsQueryHandler : IRequestHandler<GetBestSellingCollectionsQuery, List<CollectionAdminDto>>
{
    private readonly IApplicationDbContext _context;

    public GetBestSellingCollectionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CollectionAdminDto>> Handle(GetBestSellingCollectionsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Collections
            .AsQueryable();

        if (!request.IncludeInactive)
        {
            query = query.Where(c => c.IsActive);
        }

        var collections = await query
            .Select(c => new CollectionAdminDto
            {
                Id = c.Id,
                Name = c.Name ?? "",
                Slug = c.Slug,
                BannerImageUrl = c.BannerImageUrl,
                Description = c.Description,
                ReleaseDate = c.ReleaseDate,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                ProductCount = c.ProductCollections.Count,
                TotalSold = c.ProductCollections
                    .SelectMany(pc => pc.Product.ProductVariants)
                    .SelectMany(v => v.OrderItems)
                    .Where(oi => oi.Order != null && oi.Order.OrderStatus == "Completed")
                    .Select(oi => oi.OrderId)
                    .Distinct()
                    .Count(),
            })
            .OrderByDescending(c => c.TotalSold)
            .Take(request.Count)
            .ToListAsync(cancellationToken);

        return collections;
    }
}