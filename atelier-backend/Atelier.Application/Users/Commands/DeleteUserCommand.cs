using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Users.Commands;

public class DeleteUserCommand : IRequest<bool>
{
    public int Id { get; set; }
}

public class DeleteUserCommandHandler : IRequestHandler<DeleteUserCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteUserCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteUserCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .Include(u => u.UserRoles)
            .Include(u => u.UserAddresses)
            .Include(u => u.Cart)
            .Include(u => u.Wishlists)
            .FirstOrDefaultAsync(u => u.Id == request.Id, cancellationToken);

        if (user == null)
            throw new Exception($"Không tìm thấy người dùng với ID = {request.Id}");

        if (await _context.Orders.AnyAsync(o => o.UserId == request.Id, cancellationToken))
            throw new Exception("Không thể xóa người dùng vì còn đơn hàng liên kết.");

        // Xóa các thực thể liên kết trước
        if (user.Cart != null)
            _context.Carts.Remove(user.Cart);

        _context.Wishlists.RemoveRange(user.Wishlists);
        _context.UserAddresses.RemoveRange(user.UserAddresses);
        _context.UserRoles.RemoveRange(user.UserRoles);
        _context.Users.Remove(user);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}