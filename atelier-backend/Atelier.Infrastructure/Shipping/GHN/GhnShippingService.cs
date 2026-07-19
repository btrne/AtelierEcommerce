using Atelier.Application.Common.Interfaces;
using Atelier.Application.Shipping.Services;
using Atelier.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Atelier.Infrastructure.Shipping.GHN;

public class GhnShippingService : IShippingService
{
    public bool CanHandle(string providerCode) => providerCode == "GHN";
    private readonly IApplicationDbContext _context;
    private readonly GhnApiClient _apiClient;
    private readonly GhnLocationCache _locationCache;
    private readonly GhnOptions _options;

    public GhnShippingService(
        IApplicationDbContext context,
        GhnApiClient apiClient,
        GhnLocationCache locationCache,
        IOptions<GhnOptions> options)
    {
        _context = context;
        _apiClient = apiClient;
        _locationCache = locationCache;
        _options = options.Value;
    }

    public async Task<CreateShipmentResult> CreateShipmentAsync(int orderId, int providerId, decimal weight, CancellationToken ct = default)
    {
        var order = await _context.Orders
            .Include(o => o.OrderItems)
                .ThenInclude(oi => oi.ProductVariant)
                    .ThenInclude(v => v.Product)
            .FirstOrDefaultAsync(o => o.Id == orderId, ct);

        if (order == null)
            return new CreateShipmentResult { IsSuccess = false, ErrorMessage = $"Không tìm thấy đơn hàng ID = {orderId}" };

        var provider = await _context.ShippingProviders
            .FirstOrDefaultAsync(p => p.Id == providerId, ct);

        if (provider == null)
            return new CreateShipmentResult { IsSuccess = false, ErrorMessage = "Không tìm thấy đơn vị vận chuyển" };

        if (provider.Code != "GHN")
        {
            return new CreateShipmentResult { IsSuccess = false, ErrorMessage = $"Chưa hỗ trợ tạo vận đơn cho {provider.Name}" };
        }

        try
        {
            var (_, toDistrictId, toWardCode) = await _locationCache.ResolveAsync(
                order.ShippingProvince, order.ShippingDistrict, order.ShippingWard, ct);

            var fromDistrictId = await GetFromDistrictIdAsync(ct);

            var isCod = order.PaymentMethodId == 1;

            if (isCod && order.TotalAmount > 50000000)
                return new CreateShipmentResult { IsSuccess = false, ErrorMessage = "Đơn hàng trên 50 triệu không hỗ trợ COD. Vui lòng chọn VNPay." };

            var createRequest = new GhnCreateOrderRequest
            {
                PaymentTypeId = isCod ? 2 : 1,
                Note = $"Đơn hàng {order.OrderCode}",
                RequiredNote = "CHOXEMHANGKHONGTHU",
                FromName = "Atelier Shop",
                FromPhone = _options.FromPhone,
                FromAddress = _options.FromAddress,
                FromWardCode = _options.FromWardCode,
                FromDistrictId = fromDistrictId,
                ToName = order.ShippingContactName,
                ToPhone = order.ShippingPhone,
                ToAddress = $"{order.ShippingDetail}, {order.ShippingWard}, {order.ShippingDistrict}, {order.ShippingProvince}",
                ToWardCode = toWardCode,
                ToDistrictId = toDistrictId,
                CodAmount = isCod ? (int)order.TotalAmount : 0,
                Weight = (int)Math.Max(1, weight),
                Length = 10,
                Width = 10,
                Height = 10,
                ServiceTypeId = 2,
                InsuranceValue = (int)order.TotalAmount,
                Items = order.OrderItems.Select(oi => new GhnOrderItem
                {
                    Name = oi.ProductVariant?.Product?.Name ?? (oi.ProductVariantId.HasValue ? $"Sản phẩm #{oi.ProductVariantId}" : "Sản phẩm chế tác"),
                    Code = oi.ProductVariant?.Sku,
                    Quantity = oi.Quantity,
                    Price = (int)oi.UnitPrice,
                    Weight = (int)Math.Max(50, oi.ProductVariant?.Weight ?? 200),
                }).ToList(),
            };

            var (data, errorMessage) = await _apiClient.CreateOrderAsync(createRequest, ct);
            if (data == null)
                return new CreateShipmentResult { IsSuccess = false, ErrorMessage = errorMessage ?? "GHN không phản hồi" };

            return new CreateShipmentResult
            {
                TrackingCode = data.OrderCode,
                TotalFee = data.TotalFee,
                ExpectedDeliveryDate = data.ExpectedDeliveryTime,
                IsSuccess = true,
            };
        }
        catch (Exception ex)
        {
            return new CreateShipmentResult { IsSuccess = false, ErrorMessage = ex.Message };
        }
    }

    private async Task<int> GetFromDistrictIdAsync(CancellationToken ct)
    {
        return await _locationCache.GetFromDistrictIdAsync();
    }
}
