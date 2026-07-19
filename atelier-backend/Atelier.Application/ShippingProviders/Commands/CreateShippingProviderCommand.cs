using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.ShippingProviders.Commands;

public class CreateShippingProviderCommand : IRequest<ShippingProviderDto>
{
    public string Name { get; set; } = null!;
    public string Code { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}

public class CreateShippingProviderCommandHandler : IRequestHandler<CreateShippingProviderCommand, ShippingProviderDto>
{
    private readonly IApplicationDbContext _context;

    public CreateShippingProviderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ShippingProviderDto> Handle(CreateShippingProviderCommand request, CancellationToken cancellationToken)
    {
        var exists = await _context.ShippingProviders.AnyAsync(p => p.Code == request.Code, cancellationToken);
        if (exists)
            throw new Exception($"Mã vận chuyển '{request.Code}' đã tồn tại.");

        var provider = new ShippingProvider
        {
            Name = request.Name,
            Code = request.Code,
            IsActive = request.IsActive,
        };

        _context.ShippingProviders.Add(provider);
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