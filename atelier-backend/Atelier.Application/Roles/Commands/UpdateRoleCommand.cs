using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Roles.Commands;

public class UpdateRoleCommand : IRequest<RoleDto>
{
    public int Id { get; set; }
    public string? Code { get; set; }
    public string? Name { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand, RoleDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RoleDto> Handle(UpdateRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (role == null)
            throw new Exception($"Không tìm thấy quyền với ID = {request.Id}");

        if (request.Code != null)
        {
            var exists = await _context.Roles.AnyAsync(r => r.Code == request.Code && r.Id != request.Id, cancellationToken);
            if (exists)
                throw new Exception($"Mã quyền '{request.Code}' đã tồn tại.");
            role.Code = request.Code;
        }

        if (request.Name != null)
            role.Name = request.Name;

        if (request.IsActive.HasValue)
            role.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        return new RoleDto
        {
            Id = role.Id,
            Code = role.Code ?? "",
            Name = role.Name ?? "",
            IsActive = role.IsActive,
            UserCount = role.UserRoles.Count,
        };
    }
}
