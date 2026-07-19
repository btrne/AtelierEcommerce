using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Commands;

public class DeleteAttributeOptionCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteAttributeOptionCommand(int id) { Id = id; }
}

public class DeleteAttributeOptionCommandHandler : IRequestHandler<DeleteAttributeOptionCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteAttributeOptionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteAttributeOptionCommand request, CancellationToken cancellationToken)
    {
        var option = await _context.AttributeOptions
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (option == null)
        {
            throw new Exception($"Không tìm thấy giá trị thuộc tính với ID = {request.Id}");
        }

        var inUse = await _context.VariantAttributes
            .AnyAsync(va => va.AttributeOptionId == request.Id, cancellationToken);

        if (inUse)
        {
            throw new Exception($"Không thể xóa giá trị '{option.Value}' vì đang được sử dụng bởi biến thể sản phẩm.");
        }

        _context.AttributeOptions.Remove(option);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
