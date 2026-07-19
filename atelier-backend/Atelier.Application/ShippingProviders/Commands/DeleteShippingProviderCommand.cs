using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.ShippingProviders.Commands;

public class DeleteShippingProviderCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteShippingProviderCommand(int id) { Id = id; }
}

public class DeleteShippingProviderCommandHandler : IRequestHandler<DeleteShippingProviderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteShippingProviderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteShippingProviderCommand request, CancellationToken cancellationToken)
    {
        var provider = await _context.ShippingProviders
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (provider == null)
            throw new Exception($"Không tìm thấy đơn vị vận chuyển với ID = {request.Id}");

        var hasShipments = await _context.Shipments.AnyAsync(s => s.ShippingProviderId == request.Id, cancellationToken);
        if (hasShipments)
            throw new Exception($"Không thể xóa '{provider.Name}' vì đã được sử dụng trong vận đơn.");

        _context.ShippingProviders.Remove(provider);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}