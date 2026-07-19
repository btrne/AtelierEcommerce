using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Commands;

public class UpdateAttributeCommand : IRequest<AttributeDto>
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
}

public class UpdateAttributeCommandHandler : IRequestHandler<UpdateAttributeCommand, AttributeDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateAttributeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AttributeDto> Handle(UpdateAttributeCommand request, CancellationToken cancellationToken)
    {
        var attribute = await _context.Attributes
            .Include(a => a.AttributeOptions)
            .FirstOrDefaultAsync(a => a.Id == request.Id, cancellationToken);

        if (attribute == null)
        {
            throw new Exception($"Không tìm thấy thuộc tính với ID = {request.Id}");
        }

        var existing = await _context.Attributes
            .AnyAsync(a => a.Name == request.Name && a.Id != request.Id, cancellationToken);
        if (existing)
        {
            throw new Exception($"Thuộc tính '{request.Name}' đã tồn tại.");
        }

        attribute.Name = request.Name;
        await _context.SaveChangesAsync(cancellationToken);

        return new AttributeDto
        {
            Id = attribute.Id,
            Name = attribute.Name,
            Options = attribute.AttributeOptions
                .OrderBy(o => o.Value)
                .Select(o => new AttributeOptionDto
                {
                    Id = o.Id,
                    AttributeId = o.AttributeId,
                    Value = o.Value ?? "",
                })
                .ToList(),
        };
    }
}
