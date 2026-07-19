using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Categories.Commands;

public class CreateCategoryCommand : IRequest<CategoryAdminDto>
{
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateCategoryCommandHandler : IRequestHandler<CreateCategoryCommand, CategoryAdminDto>
{
    private readonly IApplicationDbContext _context;

    public CreateCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryAdminDto> Handle(CreateCategoryCommand request, CancellationToken cancellationToken)
    {
        var slug = request.Slug ?? request.Name.ToLower().Replace(" ", "-");

        var existing = await _context.Categories.AnyAsync(c => c.Slug == slug, cancellationToken);
        if (existing)
        {
            throw new Exception($"Slug '{slug}' đã tồn tại.");
        }

        var category = new Category
        {
            Name = request.Name,
            Slug = slug,
            IsActive = request.IsActive,
        };

        _context.Categories.Add(category);
        await _context.SaveChangesAsync(cancellationToken);

        return new CategoryAdminDto
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug,
            IsActive = category.IsActive,
            ProductCount = 0,
        };
    }
}
