using Atelier.Application.DTOs;
using Atelier.Application.Payments.Services;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;

namespace Atelier.Application.Orders.Commands
{
    public class CheckoutCommandHandler : IRequestHandler<CheckoutCommand, CheckoutResult>
    {
        private readonly IApplicationDbContext _context;
        private readonly IVnPayService _vnPayService;

        public CheckoutCommandHandler(
            IApplicationDbContext context,
            IVnPayService vnPayService)
        {
            _context = context;
            _vnPayService = vnPayService;
        }

        public async Task<CheckoutResult> Handle(CheckoutCommand request, CancellationToken cancellationToken)
        {
            int paymentMethodId = request.PaymentMethodId ?? 1;

            var order = new Order
            {
                UserId = request.UserId,
                OrderCode = "ORD" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
                PaymentMethodId = paymentMethodId,
                ShippingContactName = request.RecipientName,
                ShippingPhone = request.RecipientPhone,
                ShippingProvince = request.ShippingProvince,
                ShippingDistrict = request.ShippingDistrict,
                ShippingWard = request.ShippingWard,
                ShippingDetail = request.ShippingAddress,
                OrderStatus = "Pending",
                SubtotalAmount = 0,
                ShippingFee = request.ShippingFee,
                PreferredCarrierCode = request.PreferredCarrierCode,
                TotalAmount = 0,
                CreatedAt = DateTime.UtcNow,
            };

            decimal totalAmount = 0;

            if (request.CustomRequestId.HasValue)
            {
                var cr = await _context.CustomRequests
                    .FirstOrDefaultAsync(cr => cr.Id == request.CustomRequestId.Value, cancellationToken)
                    ?? throw new Exception("Không tìm thấy yêu cầu chế tác.");

                if (cr.UserId != request.UserId)
                    throw new Exception("Yêu cầu chế tác không thuộc về bạn.");

                if (cr.Status != "Confirmed")
                    throw new Exception("Yêu cầu chế tác chưa được xác nhận.");

                if (cr.QuotedPrice == null)
                    throw new Exception("Yêu cầu chế tác chưa có báo giá.");

                order.CustomRequestId = cr.Id;
                totalAmount = cr.QuotedPrice.Value;
                order.SubtotalAmount = totalAmount;

                order.OrderItems.Add(new OrderItem
                {
                    ProductNameSnapshot = cr.Description ?? $"Chế tác #{cr.Id}",
                    VariantSnapshot = "",
                    Quantity = 1,
                    UnitPrice = cr.QuotedPrice.Value,
                    CreatedAt = DateTime.UtcNow,
                });
            }
            else
            {
                if (request.CartItems == null || request.CartItems.Count == 0)
                {
                    throw new Exception("Giỏ hàng trống hoặc không tồn tại!");
                }

                foreach (var item in request.CartItems)
                {
                    var variant = await _context.ProductVariants
                        .Include(v => v.Product)
                        .FirstOrDefaultAsync(v => v.Id == item.ProductVariantId, cancellationToken);

                    if (variant == null)
                    {
                        throw new Exception($"Sản phẩm (variant id={item.ProductVariantId}) không tồn tại.");
                    }

                    var available = variant.Quantity;
                    if (available < item.Quantity)
                    {
                        throw new Exception($"Sản phẩm '{variant.Sku ?? variant.Id.ToString()}' không đủ số lượng (còn {available}).");
                    }

                    decimal price = variant.Price;

                    var orderItem = new OrderItem
                    {
                        ProductVariantId = item.ProductVariantId,
                        ProductNameSnapshot = variant.Product?.Name ?? "",
                        VariantSnapshot = variant.Sku,
                        Quantity = item.Quantity,
                        UnitPrice = price,
                        CreatedAt = DateTime.UtcNow,
                    };

                    order.OrderItems.Add(orderItem);

                    variant.Quantity -= item.Quantity;

                    totalAmount += (price * item.Quantity);
                }

                order.SubtotalAmount = totalAmount;
            }

            if (request.VoucherId.HasValue && request.VoucherDiscount.HasValue)
            {
                var voucher = await _context.Vouchers
                    .FirstOrDefaultAsync(v => v.Id == request.VoucherId.Value, cancellationToken);
                if (voucher != null)
                {
                    order.VoucherId = request.VoucherId;
                    order.VoucherDiscount = request.VoucherDiscount;

                    if (request.UserId.HasValue)
                    {
                        var usage = new VoucherUsage
                        {
                            VoucherId = voucher.Id,
                            UserId = request.UserId.Value,
                            UsedAt = DateTime.UtcNow,
                        };
                        order.VoucherUsages.Add(usage);
                    }
                }
            }

            decimal comboDiscount = 0;
            if (request.AppliedComboId.HasValue && request.ComboDiscount.HasValue)
            {
                var combo = await _context.ProductCombos
                    .FirstOrDefaultAsync(c => c.Id == request.AppliedComboId.Value, cancellationToken);
                if (combo != null && combo.IsActive
                    && (combo.MaxUses <= 0 || combo.CurrentUses < combo.MaxUses))
                {
                    order.AppliedComboId = combo.Id;
                    order.ComboDiscount = request.ComboDiscount;
                    combo.CurrentUses += 1;
                    comboDiscount = request.ComboDiscount.Value;
                }
            }

            order.TotalAmount = totalAmount + request.ShippingFee - comboDiscount - (order.VoucherDiscount ?? 0);
            if (order.TotalAmount < 0) order.TotalAmount = 0;

            var payment = new Payment
            {
                PaymentMethodId = paymentMethodId,
                Amount = order.TotalAmount,
                Status = "Pending",
            };
            order.Payments.Add(payment);

            order.OrderLogs.Add(new OrderLog
            {
                FromStatus = null,
                ToStatus = "Pending",
                Note = "Đơn hàng được tạo",
                CreatedAt = DateTime.UtcNow,
            });

            _context.Orders.Add(order);

            try
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                var innerEx = ex;
                var messages = new List<string>();
                while (innerEx != null)
                {
                    messages.Add($"{innerEx.GetType().Name}: {innerEx.Message}");
                    innerEx = innerEx.InnerException;
                }
                throw new Exception("SaveChanges failed: " + string.Join(" | ", messages));
            }

            string? paymentUrl = null;
            if (paymentMethodId == 2)
            {
                paymentUrl = _vnPayService.CreatePaymentUrl(order);
                if (string.IsNullOrEmpty(paymentUrl))
                {
                    throw new Exception("Tạo link thanh toán VNPay thất bại");
                }
            }
            var message = paymentMethodId == 1
                ? "Đặt hàng thành công! Vui lòng thanh toán khi nhận hàng."
                : "Đặt hàng thành công! Đang chuyển hướng đến cổng thanh toán...";

            return new CheckoutResult
            {
                OrderId = order.Id,
                PaymentUrl = paymentUrl,
                Message = message,
            };
        }
    }
}