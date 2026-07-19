using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Categories.Commands;

public class UpdateCategoryCommand : IRequest<CategoryAdminDto>
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Slug { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateCategoryCommandHandler : IRequestHandler<UpdateCategoryCommand, CategoryAdminDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CategoryAdminDto> Handle(UpdateCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (category == null)
        {
            throw new Exception($"Không tìm thấy danh mục với ID = {request.Id}");
        }

        if (request.Name != null)
            category.Name = request.Name;

        if (request.Slug != null)
        {
            var slugExists = await _context.Categories
                .AnyAsync(c => c.Slug == request.Slug && c.Id != request.Id, cancellationToken);
            if (slugExists)
                throw new Exception($"Slug '{request.Slug}' đã tồn tại.");
            category.Slug = request.Slug;
        }

        if (request.IsActive.HasValue)
            category.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        return new CategoryAdminDto
        {
            Id = category.Id,
            Name = category.Name,
            Slug = category.Slug,
            IsActive = category.IsActive,
            ProductCount = category.Products.Count,
        };
    }
}
