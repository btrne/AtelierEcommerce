using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.ShippingProviders.Commands;

public class UpdateShippingProviderCommand : IRequest<ShippingProviderDto>
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Code { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateShippingProviderCommandHandler : IRequestHandler<UpdateShippingProviderCommand, ShippingProviderDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateShippingProviderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ShippingProviderDto> Handle(UpdateShippingProviderCommand request, CancellationToken cancellationToken)
    {
        var provider = await _context.ShippingProviders
            .FirstOrDefaultAsync(p => p.Id == request.Id, cancellationToken);

        if (provider == null)
            throw new Exception($"Không tìm thấy đơn vị vận chuyển với ID = {request.Id}");

        if (request.Name != null)
            provider.Name = request.Name;

        if (request.Code != null)
            provider.Code = request.Code;

        if (request.IsActive.HasValue)
            provider.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        return new ShippingProviderDto
        {
            Id = provider.Id,
            Name = provider.Name ?? "",
            Code = provider.Code ?? "",
            IsActive = provider.IsActive,
        };
    }
}