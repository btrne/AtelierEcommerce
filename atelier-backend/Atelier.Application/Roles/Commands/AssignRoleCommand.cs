using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Roles.Commands;

public class AssignRoleCommand : IRequest<bool>
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
}

public class AssignRoleCommandHandler : IRequestHandler<AssignRoleCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public AssignRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(AssignRoleCommand request, CancellationToken cancellationToken)
    {
        var exists = await _context.UserRoles
            .AnyAsync(ur => ur.UserId == request.UserId && ur.RoleId == request.RoleId, cancellationToken);

        if (exists)
            return true;

        _context.UserRoles.Add(new UserRole
        {
            UserId = request.UserId,
            RoleId = request.RoleId,
        });

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class RemoveRoleCommand : IRequest<bool>
{
    public int UserId { get; set; }
    public int RoleId { get; set; }
}

public class RemoveRoleCommandHandler : IRequestHandler<RemoveRoleCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public RemoveRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(RemoveRoleCommand request, CancellationToken cancellationToken)
    {
        var userRole = await _context.UserRoles
            .FirstOrDefaultAsync(ur => ur.UserId == request.UserId && ur.RoleId == request.RoleId, cancellationToken);

        if (userRole == null)
            throw new Exception("Người dùng chưa được gán quyền này.");

        _context.UserRoles.Remove(userRole);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
