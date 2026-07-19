using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Collections.Queries;

public class GetCollectionByIdQuery : IRequest<CollectionAdminDto?>
{
    public int Id { get; set; }
    public GetCollectionByIdQuery(int id) { Id = id; }
}

public class GetCollectionByIdQueryHandler : IRequestHandler<GetCollectionByIdQuery, CollectionAdminDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCollectionByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CollectionAdminDto?> Handle(GetCollectionByIdQuery request, CancellationToken cancellationToken)
    {
        var collection = await _context.Collections
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
            })
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.IsActive, cancellationToken);

        return collection;
    }
}
