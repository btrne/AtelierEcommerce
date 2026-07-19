using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Commands;

public class CreateAttributeOptionCommand : IRequest<AttributeOptionDto>
{
    public int AttributeId { get; set; }
    public string Value { get; set; } = null!;
}

public class CreateAttributeOptionCommandHandler : IRequestHandler<CreateAttributeOptionCommand, AttributeOptionDto>
{
    private readonly IApplicationDbContext _context;

    public CreateAttributeOptionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AttributeOptionDto> Handle(CreateAttributeOptionCommand request, CancellationToken cancellationToken)
    {
        var attributeExists = await _context.Attributes
            .AnyAsync(a => a.Id == request.AttributeId, cancellationToken);
        if (!attributeExists)
        {
            throw new Exception($"Không tìm thấy thuộc tính với ID = {request.AttributeId}");
        }

        var existing = await _context.AttributeOptions
            .AnyAsync(o => o.AttributeId == request.AttributeId && o.Value == request.Value, cancellationToken);
        if (existing)
        {
            throw new Exception($"Giá trị '{request.Value}' đã tồn tại trong thuộc tính này.");
        }

        var option = new AttributeOption
        {
            AttributeId = request.AttributeId,
            Value = request.Value,
        };

        _context.AttributeOptions.Add(option);
        await _context.SaveChangesAsync(cancellationToken);

        return new AttributeOptionDto
        {
            Id = option.Id,
            AttributeId = option.AttributeId,
            Value = option.Value ?? "",
        };
    }
}
