using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Commands;

public class DeleteAttributeCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteAttributeCommand(int id) { Id = id; }
}

public class DeleteAttributeCommandHandler : IRequestHandler<DeleteAttributeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteAttributeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteAttributeCommand request, CancellationToken cancellationToken)
    {
        var attribute = await _context.Attributes
            .Include(a => a.AttributeOptions)
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

        if (attribute == null)
        {
            throw new Exception($"Không tìm thấy thuộc tính với ID = {request.Id}");
        }

        var optionsInUse = await _context.VariantAttributes
            .AnyAsync(va => attribute.AttributeOptions.Select(o => o.Id).Contains(va.AttributeOptionId), cancellationToken);

        if (optionsInUse)
        {
            throw new Exception($"Không thể xóa thuộc tính '{attribute.Name}' vì đang được sử dụng bởi các biến thể sản phẩm.");
        }

        _context.AttributeOptions.RemoveRange(attribute.AttributeOptions);
        _context.Attributes.Remove(attribute);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
