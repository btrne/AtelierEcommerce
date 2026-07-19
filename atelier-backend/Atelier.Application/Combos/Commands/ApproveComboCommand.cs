using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Combos.Commands;

public class ApproveComboCommand : IRequest
{
    public int Id { get; set; }
    public decimal? DiscountOverride { get; set; }
}

public class ApproveComboCommandHandler
    : IRequestHandler<ApproveComboCommand>
{
    private readonly IApplicationDbContext _context;

    public ApproveComboCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(ApproveComboCommand request, CancellationToken cancellationToken)
    {
        var combo = await _context.ProductCombos
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken)
            ?? throw new Exception("Không tìm thấy combo.");

        combo.IsActive = true;

        if (request.DiscountOverride.HasValue)
            combo.DiscountValue = request.DiscountOverride.Value;

        combo.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
