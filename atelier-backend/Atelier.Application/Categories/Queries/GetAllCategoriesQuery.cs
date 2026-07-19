using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Categories.Queries;

public class GetAllCategoriesQuery : IRequest<List<CategoryDto>>
{
    public bool IncludeInactive { get; set; }
}

public class GetAllCategoriesQueryHandler : IRequestHandler<GetAllCategoriesQuery, List<CategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllCategoriesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CategoryDto>> Handle(GetAllCategoriesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Categories
            .OrderBy(c => c.Name)
            .AsQueryable();

        if (!request.IncludeInactive)
        {
            query = query.Where(c => c.IsActive);
        }

        var categories = await query
            .Select(c => new CategoryDto
            {
                Id = c.Id,
                Name = c.Name ?? "",
                Slug = c.Slug,
                IsActive = c.IsActive,
                ProductCount = c.Products.Count
            })
            .ToListAsync(cancellationToken);

        return categories;
    }
}
