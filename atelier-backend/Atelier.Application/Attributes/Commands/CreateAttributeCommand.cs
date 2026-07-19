using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Commands;

public class CreateAttributeCommand : IRequest<AttributeDto>
{
    public string Name { get; set; } = null!;
}

public class CreateAttributeCommandHandler : IRequestHandler<CreateAttributeCommand, AttributeDto>
{
    private readonly IApplicationDbContext _context;

    public CreateAttributeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AttributeDto> Handle(CreateAttributeCommand request, CancellationToken cancellationToken)
    {
        var existing = await _context.Attributes
            .AnyAsync(a => a.Name == request.Name, cancellationToken);
        if (existing)
        {
            throw new Exception($"Thuộc tính '{request.Name}' đã tồn tại.");
        }

        var attribute = new ProductAttribute
        {
            Name = request.Name,
        };

        _context.Attributes.Add(attribute);
        await _context.SaveChangesAsync(cancellationToken);

        return new AttributeDto
        {
            Id = attribute.Id,
            Name = attribute.Name,
            Options = new List<AttributeOptionDto>(),
        };
    }
}
