using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Commands;

public class UpdateOrderStatusCommand : IRequest<bool>
{
    public int Id { get; set; }
    public string Status { get; set; } = null!;
}

public class UpdateOrderStatusCommandHandler : IRequestHandler<UpdateOrderStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateOrderStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateOrderStatusCommand request, CancellationToken cancellationToken)
    {
        var validStatuses = new[] { "Pending", "Confirmed", "Processing", "Shipping", "Completed", "Cancelled" };
        if (!validStatuses.Contains(request.Status))
            throw new Exception($"Trạng thái không hợp lệ. Chấp nhận: {string.Join(", ", validStatuses)}");

        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (order == null)
            throw new Exception($"Không tìm thấy đơn hàng với ID = {request.Id}");

        if (order.OrderStatus == "Cancelled")
            throw new Exception("Không thể cập nhật trạng thái đơn hàng đã hủy.");

        if (order.OrderStatus == "Completed")
            throw new Exception("Không thể cập nhật trạng thái đơn hàng đã hoàn thành.");

        var oldStatus = order.OrderStatus;

        order.OrderStatus = request.Status;

        if (request.Status == "Cancelled")
            order.CancelledAt = DateTime.UtcNow;

        order.OrderLogs.Add(new OrderLog
        {
            FromStatus = oldStatus,
            ToStatus = request.Status,
            Note = null,
            CreatedAt = DateTime.UtcNow,
        });

        // Khi đơn hàng COD được chuyển sang hoàn thành, ghi nhận thanh toán
        var paymentMethod = await _context.PaymentMethods
            .FirstOrDefaultAsync(pm => pm.Id == order.PaymentMethodId, cancellationToken);

        if (request.Status == "Completed" && paymentMethod != null && paymentMethod.Name == "COD")
        {
            var existingPayment = await _context.Payments
                .FirstOrDefaultAsync(p => p.OrderId == order.Id, cancellationToken);

            if (existingPayment != null)
            {
                existingPayment.Status = "Completed";
                existingPayment.PaidAt = DateTime.UtcNow;
            }
            else
            {
                _context.Payments.Add(new Payment
                {
                    OrderId = order.Id,
                    PaymentMethodId = 1,
                    Amount = order.TotalAmount,
                    Status = "Completed",
                    PaidAt = DateTime.UtcNow,
                    TransactionCode = $"COD-{order.OrderCode}",
                });
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
