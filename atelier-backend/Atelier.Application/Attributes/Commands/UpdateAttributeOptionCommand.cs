using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Attributes.Commands;

public class UpdateAttributeOptionCommand : IRequest<AttributeOptionDto>
{
    public int Id { get; set; }
    public string Value { get; set; } = null!;
}

public class UpdateAttributeOptionCommandHandler : IRequestHandler<UpdateAttributeOptionCommand, AttributeOptionDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateAttributeOptionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AttributeOptionDto> Handle(UpdateAttributeOptionCommand request, CancellationToken cancellationToken)
    {
        var option = await _context.AttributeOptions
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (option == null)
        {
            throw new Exception($"Không tìm thấy giá trị thuộc tính với ID = {request.Id}");
        }

        var existing = await _context.AttributeOptions
            .AnyAsync(o => o.AttributeId == option.AttributeId && o.Value == request.Value && o.Id != request.Id, cancellationToken);
        if (existing)
        {
            throw new Exception($"Giá trị '{request.Value}' đã tồn tại trong thuộc tính này.");
        }

        option.Value = request.Value;
        await _context.SaveChangesAsync(cancellationToken);

        return new AttributeOptionDto
        {
            Id = option.Id,
            AttributeId = option.AttributeId,
            Value = option.Value ?? "",
        };
    }
}
