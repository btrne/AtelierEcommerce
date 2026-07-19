using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Combos.Commands;

public class DeleteComboCommand : IRequest
{
    public int Id { get; set; }
}

public class DeleteComboCommandHandler
    : IRequestHandler<DeleteComboCommand>
{
    private readonly IApplicationDbContext _context;

    public DeleteComboCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteComboCommand request, CancellationToken cancellationToken)
    {
        var combo = await _context.ProductCombos
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken)
            ?? throw new Exception("Không tìm thấy combo.");

        _context.ProductCombos.Remove(combo);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
