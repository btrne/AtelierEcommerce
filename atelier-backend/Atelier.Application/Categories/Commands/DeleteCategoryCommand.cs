using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Categories.Commands;

public class DeleteCategoryCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteCategoryCommand(int id) { Id = id; }
}

public class DeleteCategoryCommandHandler : IRequestHandler<DeleteCategoryCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteCategoryCommand request, CancellationToken cancellationToken)
    {
        var category = await _context.Categories
            .Include(c => c.Products)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (category == null)
        {
            throw new Exception($"Không tìm thấy danh mục với ID = {request.Id}");
        }

        if (category.Products.Any())
        {
            throw new Exception($"Không thể xóa danh mục '{category.Name}' vì còn {category.Products.Count} sản phẩm thuộc danh mục này.");
        }

        _context.Categories.Remove(category);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
