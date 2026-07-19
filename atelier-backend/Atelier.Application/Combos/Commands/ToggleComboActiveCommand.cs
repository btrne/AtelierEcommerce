using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Combos.Commands;

public class ToggleComboActiveCommand : IRequest
{
    public int Id { get; set; }
}

public class ToggleComboActiveCommandHandler
    : IRequestHandler<ToggleComboActiveCommand>
{
    private readonly IApplicationDbContext _context;

    public ToggleComboActiveCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(ToggleComboActiveCommand request, CancellationToken cancellationToken)
    {
        var combo = await _context.ProductCombos
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken)
            ?? throw new Exception("Không tìm thấy combo.");

        combo.IsActive = !combo.IsActive;
        combo.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
