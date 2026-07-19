using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Categories.Queries;

public class GetCategoryByIdQuery : IRequest<CategoryAdminDto?>
{
    public int Id { get; set; }
    public GetCategoryByIdQuery(int id) { Id = id; }
}

public class GetCategoryByIdQueryHandler : IRequestHandler<GetCategoryByIdQuery, CategoryAdminDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCategoryByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryAdminDto?> Handle(GetCategoryByIdQuery request, CancellationToken cancellationToken)
    {
        var category = await _context.Categories
            .Select(c => new CategoryAdminDto
            {
                Id = c.Id,
                Name = c.Name ?? "",
                Slug = c.Slug,
                IsActive = c.IsActive,
                ProductCount = c.Products.Count
            })
            .FirstOrDefaultAsync(c => c.Id == request.Id && c.IsActive, cancellationToken);

        return category;
    }
}
