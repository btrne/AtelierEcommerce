using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Shipping.Queries;

public class GetShippingProvidersQuery : IRequest<List<ShippingProviderDto>>
{
    public bool IncludeInactive { get; set; }
}

public class GetShippingProvidersQueryHandler : IRequestHandler<GetShippingProvidersQuery, List<ShippingProviderDto>>
{
    private readonly IApplicationDbContext _context;

    public GetShippingProvidersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ShippingProviderDto>> Handle(GetShippingProvidersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ShippingProviders.AsQueryable();

        if (!request.IncludeInactive)
        {
            query = query.Where(p => p.IsActive);
        }

        return await query
            .Select(p => new ShippingProviderDto
            {
                Id = p.Id,
                Name = p.Name,
                Code = p.Code,
                IsActive = p.IsActive,
            })
            .ToListAsync(cancellationToken);
    }
}
