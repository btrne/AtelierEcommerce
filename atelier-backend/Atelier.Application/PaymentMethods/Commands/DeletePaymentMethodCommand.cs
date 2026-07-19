using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.PaymentMethods.Commands;

public class DeletePaymentMethodCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeletePaymentMethodCommand(int id) { Id = id; }
}

public class DeletePaymentMethodCommandHandler : IRequestHandler<DeletePaymentMethodCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeletePaymentMethodCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeletePaymentMethodCommand request, CancellationToken cancellationToken)
    {
        var method = await _context.PaymentMethods
            .FirstOrDefaultAsync(pm => pm.Id == request.Id, cancellationToken);

        if (method == null)
            throw new Exception($"Không tìm thấy phương thức thanh toán với ID = {request.Id}");

        var hasOrders = await _context.Orders.AnyAsync(o => o.PaymentMethodId == request.Id, cancellationToken);
        if (hasOrders)
            throw new Exception($"Không thể xóa phương thức thanh toán '{method.Name}' vì đã được sử dụng trong đơn hàng.");

        _context.PaymentMethods.Remove(method);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
