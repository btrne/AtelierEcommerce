using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Collections.Commands;

public class UpdateCollectionCommand : IRequest<CollectionAdminDto>
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Slug { get; set; }
    public string? BannerImageUrl { get; set; }
    public string? Description { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateCollectionCommandHandler : IRequestHandler<UpdateCollectionCommand, CollectionAdminDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateCollectionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CollectionAdminDto> Handle(UpdateCollectionCommand request, CancellationToken cancellationToken)
    {
        var collection = await _context.Collections
            .Include(c => c.ProductCollections)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (collection == null)
        {
            throw new Exception($"Không tìm thấy bộ sưu tập với ID = {request.Id}");
        }

        if (request.Name != null)
            collection.Name = request.Name;

        if (request.Slug != null)
        {
            var slugExists = await _context.Collections
                .AnyAsync(c => c.Slug == request.Slug && c.Id != request.Id, cancellationToken);
            if (slugExists)
                throw new Exception($"Slug '{request.Slug}' đã tồn tại.");
            collection.Slug = request.Slug;
        }

        if (request.BannerImageUrl != null)
            collection.BannerImageUrl = request.BannerImageUrl;

        if (request.Description != null)
            collection.Description = request.Description;

        if (request.ReleaseDate.HasValue)
            collection.ReleaseDate = request.ReleaseDate;

        if (request.IsActive.HasValue)
            collection.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        return new CollectionAdminDto
        {
            Id = collection.Id,
            Name = collection.Name,
            Slug = collection.Slug,
            BannerImageUrl = collection.BannerImageUrl,
            Description = collection.Description,
            ReleaseDate = collection.ReleaseDate,
            IsActive = collection.IsActive,
            CreatedAt = collection.CreatedAt,
            ProductCount = collection.ProductCollections.Count,
        };
    }
}
