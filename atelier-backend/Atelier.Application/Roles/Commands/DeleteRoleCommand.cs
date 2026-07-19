using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Roles.Commands;

public class DeleteRoleCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteRoleCommand(int id) { Id = id; }
}

public class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteRoleCommand request, CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (role == null)
            throw new Exception($"Không tìm thấy quyền với ID = {request.Id}");

        if (role.UserRoles.Any())
            throw new Exception($"Không thể xóa quyền '{role.Name}' vì đang có {role.UserRoles.Count} người dùng được gán.");

        _context.Roles.Remove(role);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
