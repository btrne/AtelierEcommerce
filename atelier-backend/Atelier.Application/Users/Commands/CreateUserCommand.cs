using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Security;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Users.Commands;

public class CreateUserCommand : IRequest<UserAdminDto>
{
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string? Phone { get; set; }
    public List<int> RoleIds { get; set; } = new();
}

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, UserAdminDto>
{
    private readonly IApplicationDbContext _context;

    public CreateUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserAdminDto> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        if (await _context.Users.AnyAsync(u => u.Email == request.Email, cancellationToken))
            throw new Exception("Email đã được sử dụng.");

        var user = new User
        {
            Email = request.Email,
            PasswordHash = PasswordHasher.HashPassword(request.Password),
            FullName = request.FullName,
            Phone = request.Phone ?? "",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        if (request.RoleIds.Count > 0)
        {
            var validRoleIds = await _context.Roles
                .Where(r => request.RoleIds.Contains(r.Id))
                .Select(r => r.Id)
                .ToListAsync(cancellationToken);

            foreach (var roleId in validRoleIds)
            {
                _context.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        var roles = await _context.UserRoles
            .Where(ur => ur.UserId == user.Id && ur.Role.IsActive)
            .Select(ur => ur.Role.Code)
            .ToListAsync(cancellationToken);

        return new UserAdminDto
        {
            Id = user.Id,
            Email = user.Email,
            FullName = user.FullName,
            Phone = user.Phone,
            IsActive = user.IsActive,
            CreatedAt = user.CreatedAt,
            Roles = roles,
        };
    }

}
