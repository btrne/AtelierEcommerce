using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Queries;

public class GetAllAttributesQuery : IRequest<List<AttributeDto>>
{
}

public class GetAllAttributesQueryHandler : IRequestHandler<GetAllAttributesQuery, List<AttributeDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllAttributesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AttributeDto>> Handle(GetAllAttributesQuery request, CancellationToken cancellationToken)
    {
        var attributes = await _context.Attributes
            .OrderBy(a => a.Name)
            .Select(a => new AttributeDto
            {
                Id = a.Id,
                Name = a.Name ?? "",
                Options = a.AttributeOptions
                    .OrderBy(o => o.Value)
                    .Select(o => new AttributeOptionDto
                    {
                        Id = o.Id,
                        AttributeId = o.AttributeId,
                        Value = o.Value ?? "",
                    })
                    .ToList(),
                ProductCount = a.AttributeOptions
                    .SelectMany(o => o.VariantAttributes)
                    .Select(va => va.ProductVariant.ProductId)
                    .Distinct()
                    .Count(),
            })
            .ToListAsync(cancellationToken);

        return attributes;
    }
}
