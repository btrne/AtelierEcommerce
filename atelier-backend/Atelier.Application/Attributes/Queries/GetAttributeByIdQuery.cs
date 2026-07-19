using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Queries;

public class GetAttributeByIdQuery : IRequest<AttributeDto?>
{
    public int Id { get; set; }
    public GetAttributeByIdQuery(int id) { Id = id; }
}

public class GetAttributeByIdQueryHandler : IRequestHandler<GetAttributeByIdQuery, AttributeDto?>
{
    private readonly IApplicationDbContext _context;

    public GetAttributeByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AttributeDto?> Handle(GetAttributeByIdQuery request, CancellationToken cancellationToken)
    {
        var attribute = await _context.Attributes
            .Include(a => a.AttributeOptions)
            .Where(a => a.Id == request.Id)
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
            })
            .FirstOrDefaultAsync(cancellationToken);

        return attribute;
    }
}
