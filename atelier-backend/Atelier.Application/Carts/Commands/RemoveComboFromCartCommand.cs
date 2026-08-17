using MediatR;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;

namespace Atelier.Application.Carts.Commands;

public class RemoveComboFromCartCommand : IRequest
{
    public int? UserId { get; set; }
    public string? SessionId { get; set; }
}

public class RemoveComboFromCartCommandHandler : IRequestHandler<RemoveComboFromCartCommand>
{
    private readonly IApplicationDbContext _context;

    public RemoveComboFromCartCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(RemoveComboFromCartCommand request, CancellationToken cancellationToken)
    {
        if (!request.UserId.HasValue && string.IsNullOrWhiteSpace(request.SessionId))
            throw new UnauthorizedAccessException("Cart owner is required.");

        var cart = await _context.Carts
            .FirstOrDefaultAsync(c =>
                request.UserId.HasValue
                    ? c.UserId == request.UserId.Value
                    : c.SessionId == request.SessionId,
                cancellationToken);

        if (cart == null) return;

        cart.AppliedComboId = null;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
