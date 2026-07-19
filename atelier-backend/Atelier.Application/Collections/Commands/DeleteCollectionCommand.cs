using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Collections.Commands;

public class DeleteCollectionCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteCollectionCommand(int id) { Id = id; }
}

public class DeleteCollectionCommandHandler : IRequestHandler<DeleteCollectionCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteCollectionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteCollectionCommand request, CancellationToken cancellationToken)
    {
        var collection = await _context.Collections
            .Include(c => c.ProductCollections)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (collection == null)
        {
            throw new Exception($"Không tìm thấy bộ sưu tập với ID = {request.Id}");
        }

        if (collection.ProductCollections.Any())
        {
            throw new Exception($"Không thể xóa bộ sưu tập '{collection.Name}' vì còn {collection.ProductCollections.Count} sản phẩm trong bộ sưu tập này.");
        }

        _context.Collections.Remove(collection);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
