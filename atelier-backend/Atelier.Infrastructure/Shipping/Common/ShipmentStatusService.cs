using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Infrastructure.Shipping.Common;

public class ShipmentStatusService
{
    private readonly IApplicationDbContext _context;

    public ShipmentStatusService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task UpdateStatusAsync(int shipmentId, string newStatus, string? description, CancellationToken ct = default, DateTime? carrierTimestamp = null)
    {
        var shipment = await _context.Shipments
            .Include(s => s.ShipmentTrackingLogs)
            .Include(s => s.Order)
            .FirstOrDefaultAsync(s => s.Id == shipmentId, ct);

        if (shipment == null) return;

        if (shipment.Status == newStatus) return;

        var oldStatus = shipment.Status;
        shipment.Status = newStatus;

        if (newStatus == "Shipped" && shipment.ShippedAt == null)
            shipment.ShippedAt = DateTime.UtcNow;

        if (newStatus == "Delivered" && shipment.DeliveredAt == null)
            shipment.DeliveredAt = DateTime.UtcNow;

        var timestamp = carrierTimestamp ?? DateTime.UtcNow;

        shipment.ShipmentTrackingLogs.Add(new ShipmentTrackingLog
        {
            ShipmentId = shipmentId,
            Status = newStatus,
            Description = description,
            CreatedAt = timestamp,
        });

        // Auto-transition order to Completed when shipment is delivered
        if (newStatus == "Delivered" && shipment.Order != null)
        {
            var order = shipment.Order;
            if (order.OrderStatus != "Completed" && order.OrderStatus != "Cancelled")
            {
                order.OrderStatus = "Completed";

                order.OrderLogs.Add(new OrderLog
                {
                    FromStatus = "Shipping",
                    ToStatus = "Completed",
                    Note = "Đơn hàng đã được giao thành công",
                    CreatedAt = DateTime.UtcNow,
                });

                // Auto-settle COD payment
                var paymentMethod = await _context.PaymentMethods
                    .FirstOrDefaultAsync(pm => pm.Id == order.PaymentMethodId, ct);

                if (paymentMethod != null && paymentMethod.Name == "COD")
                {
                    var existingPayment = await _context.Payments
                        .FirstOrDefaultAsync(p => p.OrderId == order.Id, ct);

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
            }
        }

        await _context.SaveChangesAsync(ct);
    }

    public async Task AddTrackingLogAsync(int shipmentId, string carrierStatus, string? description, CancellationToken ct = default, DateTime? carrierTimestamp = null)
    {
        var shipment = await _context.Shipments
            .Include(s => s.ShipmentTrackingLogs)
            .FirstOrDefaultAsync(s => s.Id == shipmentId, ct);

        if (shipment == null) return;

        var timestamp = carrierTimestamp ?? DateTime.UtcNow;

        shipment.ShipmentTrackingLogs.Add(new ShipmentTrackingLog
        {
            ShipmentId = shipmentId,
            Status = shipment.Status,
            Description = description ?? $"{carrierStatus}",
            CreatedAt = timestamp,
        });

        await _context.SaveChangesAsync(ct);
    }
}
