using Atelier.Application.Common.Interfaces;
using Atelier.Application.Shipping.Services;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Atelier.Application.Shipping.Commands;

public class CreateShipmentCommand : IRequest<int>
{
    public int OrderId { get; set; }
    public int ShippingProviderId { get; set; }
    public decimal? Weight { get; set; }
}

public class CreateShipmentCommandHandler : IRequestHandler<CreateShipmentCommand, int>
{
    private readonly IApplicationDbContext _context;
    private readonly IEnumerable<IShippingService> _shippingServices;
    private readonly ILogger<CreateShipmentCommandHandler> _logger;

    public CreateShipmentCommandHandler(
        IApplicationDbContext context,
        IEnumerable<IShippingService> shippingServices,
        ILogger<CreateShipmentCommandHandler> logger)
    {
        _context = context;
        _shippingServices = shippingServices;
        _logger = logger;
    }

    public async Task<int> Handle(CreateShipmentCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken);

        if (order == null)
            throw new Exception($"Không tìm thấy đơn hàng với ID = {request.OrderId}");

        if (order.OrderStatus != "Processing")
            throw new Exception("Chỉ có thể tạo vận đơn khi đơn hàng ở trạng thái Đang xử lý.");

        var provider = await _context.ShippingProviders
            .FirstOrDefaultAsync(p => p.Id == request.ShippingProviderId, cancellationToken);

        if (provider == null)
            throw new Exception($"Không tìm thấy đơn vị vận chuyển với ID = {request.ShippingProviderId}");

        var shippingService = _shippingServices.FirstOrDefault(s => s.CanHandle(provider.Code));
        if (shippingService == null)
            throw new Exception($"Chưa hỗ trợ tạo vận đơn cho {provider.Name}");

        var shipment = new Shipment
        {
            OrderId = request.OrderId,
            ShippingProviderId = request.ShippingProviderId,
            ShippingFee = order.ShippingFee,
            Status = "Pending",
            DeliveryAttemptCount = 0,
            CreatedAt = DateTime.UtcNow,
        };

        var totalWeight = request.Weight ?? order.OrderItems
            .Select(oi => oi.ProductVariant?.Weight ?? 200m)
            .Sum();

        var result = await shippingService.CreateShipmentAsync(
            request.OrderId, request.ShippingProviderId, totalWeight, cancellationToken);

        if (!result.IsSuccess)
            throw new Exception($"Tạo vận đơn {provider.Name} thất bại: {result.ErrorMessage}");

        shipment.TrackingCode = result.TrackingCode;
        shipment.ShippingFee = result.TotalFee > 0 ? result.TotalFee : order.ShippingFee;
        if (result.ExpectedDeliveryDate.HasValue)
            shipment.EstimatedDeliveryDate = result.ExpectedDeliveryDate;

        _context.Shipments.Add(shipment);

        order.OrderStatus = "Shipping";
        order.OrderLogs.Add(new OrderLog
        {
            FromStatus = "Processing",
            ToStatus = "Shipping",
            Note = $"Tạo vận đơn {provider.Name}: {result.TrackingCode}",
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync(cancellationToken);

        return shipment.Id;
    }
}