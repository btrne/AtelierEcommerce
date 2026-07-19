using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Users.Commands;

public class ToggleUserActiveCommand : IRequest<bool>
{
    public int Id { get; set; }
}

public class ToggleUserActiveCommandHandler : IRequestHandler<ToggleUserActiveCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ToggleUserActiveCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ToggleUserActiveCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

        if (user == null)
            throw new Exception($"Không tìm thấy người dùng với ID = {request.Id}");

        user.IsActive = !user.IsActive;
        await _context.SaveChangesAsync(cancellationToken);
        return user.IsActive;
    }
}
