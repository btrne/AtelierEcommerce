using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Collections.Commands;

public class CreateCollectionCommand : IRequest<CollectionAdminDto>
{
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string? BannerImageUrl { get; set; }
    public string? Description { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateCollectionCommandHandler : IRequestHandler<CreateCollectionCommand, CollectionAdminDto>
{
    private readonly IApplicationDbContext _context;

    public CreateCollectionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CollectionAdminDto> Handle(CreateCollectionCommand request, CancellationToken cancellationToken)
    {
        var slug = request.Slug ?? request.Name.ToLower().Replace(" ", "-");

        var existing = await _context.Collections.AnyAsync(c => c.Slug == slug, cancellationToken);
        if (existing)
        {
            throw new Exception($"Slug '{slug}' đã tồn tại.");
        }

        var collection = new Collection
        {
            Name = request.Name,
            Slug = slug,
            BannerImageUrl = request.BannerImageUrl,
            Description = request.Description,
            ReleaseDate = request.ReleaseDate,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Collections.Add(collection);
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
            ProductCount = 0,
        };
    }
}
