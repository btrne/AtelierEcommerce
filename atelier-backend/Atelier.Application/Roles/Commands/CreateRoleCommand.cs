using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Roles.Commands;

public class CreateRoleCommand : IRequest<RoleDto>
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}

public class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, RoleDto>
{
    private readonly IApplicationDbContext _context;

    public CreateRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RoleDto> Handle(CreateRoleCommand request, CancellationToken cancellationToken)
    {
        var exists = await _context.Roles.AnyAsync(r => r.Code == request.Code, cancellationToken);
        if (exists)
            throw new Exception($"Mã quyền '{request.Code}' đã tồn tại.");

        var role = new Role
        {
            Code = request.Code,
            Name = request.Name,
            IsActive = request.IsActive,
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync(cancellationToken);

        return new RoleDto
        {
            Id = role.Id,
            Code = role.Code ?? "",
            Name = role.Name ?? "",
            IsActive = role.IsActive,
            UserCount = 0,
        };
    }
}
