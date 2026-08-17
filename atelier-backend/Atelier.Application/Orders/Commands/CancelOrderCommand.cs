using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Commands;

public class CancelOrderCommand : IRequest<bool>
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public bool IsAdmin { get; set; }
}

public class CancelOrderCommandHandler : IRequestHandler<CancelOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CancelOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(CancelOrderCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken);

        if (order == null)
            throw new Exception($"Không tìm thấy đơn hàng với ID = {request.Id}");

        if (!request.IsAdmin && order.UserId != request.UserId)
            throw new UnauthorizedAccessException("You do not have permission to cancel this order.");

        if (order.OrderStatus == "Completed")
            throw new Exception("Không thể hủy đơn hàng đã hoàn thành.");

        if (order.OrderStatus == "Cancelled")
            throw new Exception("Đơn hàng đã được hủy trước đó.");

        foreach (var item in order.OrderItems)
        {
            var variant = await _context.ProductVariants
                .FirstOrDefaultAsync(v => v.Id == item.ProductVariantId, cancellationToken);
            if (variant != null)
            {
                variant.Quantity += item.Quantity;
            }
        }

        order.OrderLogs.Add(new OrderLog
        {
            FromStatus = order.OrderStatus,
            ToStatus = "Cancelled",
            Note = "Khách hàng yêu cầu hủy",
            CreatedAt = DateTime.UtcNow,
        });

        order.OrderStatus = "Cancelled";
        order.CancelledAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
