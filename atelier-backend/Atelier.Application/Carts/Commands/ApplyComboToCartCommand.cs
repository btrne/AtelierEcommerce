using MediatR;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;

namespace Atelier.Application.Carts.Commands;

public class ApplyComboToCartCommand : IRequest
{
    public int? UserId { get; set; }
    public string? SessionId { get; set; }
    public int ComboId { get; set; }
}

public class ApplyComboToCartCommandHandler : IRequestHandler<ApplyComboToCartCommand>
{
    private readonly IApplicationDbContext _context;

    public ApplyComboToCartCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(ApplyComboToCartCommand request, CancellationToken cancellationToken)
    {
        var cart = await _context.Carts
            .FirstOrDefaultAsync(c =>
                (request.UserId.HasValue && c.UserId == request.UserId) ||
                (!string.IsNullOrEmpty(request.SessionId) && c.SessionId == request.SessionId),
                cancellationToken);

        if (cart == null)
        {
            cart = new Domain.Entities.Cart
            {
                UserId = request.UserId,
                SessionId = request.SessionId,
            };
            _context.Carts.Add(cart);
            await _context.SaveChangesAsync(cancellationToken);
        }

        cart.AppliedComboId = request.ComboId;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
