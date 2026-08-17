using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Application.Payments.Services;
using Atelier.Application.Shipping.Services;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Orders.Commands
{
    public class CheckoutCommandHandler : IRequestHandler<CheckoutCommand, CheckoutResult>
    {
        private readonly IApplicationDbContext _context;
        private readonly IVnPayService _vnPayService;
        private readonly IEnumerable<IShippingFeeService> _shippingFeeServices;

        public CheckoutCommandHandler(
            IApplicationDbContext context,
            IVnPayService vnPayService,
            IEnumerable<IShippingFeeService> shippingFeeServices)
        {
            _context = context;
            _vnPayService = vnPayService;
            _shippingFeeServices = shippingFeeServices;
        }

        public async Task<CheckoutResult> Handle(CheckoutCommand request, CancellationToken cancellationToken)
        {
            var paymentMethodId = request.PaymentMethodId ?? 1;
            var paymentMethod = await _context.PaymentMethods
                .FirstOrDefaultAsync(pm => pm.Id == paymentMethodId && pm.IsActive, cancellationToken)
                ?? throw new Exception("Payment method is not available.");

            var order = new Order
            {
                UserId = request.UserId,
                OrderCode = "ORD" + DateTime.UtcNow.ToString("yyyyMMddHHmmss"),
                PaymentMethodId = paymentMethod.Id,
                ShippingContactName = request.RecipientName,
                ShippingPhone = request.RecipientPhone,
                ShippingProvince = request.ShippingProvince,
                ShippingDistrict = request.ShippingDistrict,
                ShippingWard = request.ShippingWard,
                ShippingDetail = request.ShippingAddress,
                OrderStatus = "Pending",
                SubtotalAmount = 0,
                ShippingFee = 0,
                PreferredCarrierCode = request.PreferredCarrierCode,
                TotalAmount = 0,
                CreatedAt = DateTime.UtcNow,
            };

            Cart? checkoutCart = null;
            decimal subtotal;
            decimal totalWeightInGram;

            if (request.CustomRequestId.HasValue)
            {
                subtotal = await AddCustomRequestItemAsync(order, request, cancellationToken);
                totalWeightInGram = 1000m;
            }
            else
            {
                checkoutCart = await GetCheckoutCartAsync(request, cancellationToken);
                (subtotal, totalWeightInGram) = AddCartItems(order, checkoutCart);
            }

            order.SubtotalAmount = subtotal;
            order.ShippingFee = await CalculateShippingFeeAsync(request, totalWeightInGram, cancellationToken);

            var comboDiscount = await ApplyComboDiscountAsync(order, checkoutCart, subtotal, cancellationToken);
            var voucherDiscount = await ApplyVoucherDiscountAsync(order, request, subtotal, cancellationToken);

            order.TotalAmount = subtotal + order.ShippingFee - comboDiscount - voucherDiscount;
            if (order.TotalAmount < 0)
                order.TotalAmount = 0;

            order.Payments.Add(new Payment
            {
                PaymentMethodId = paymentMethodId,
                Amount = order.TotalAmount,
                Status = "Pending",
            });

            order.OrderLogs.Add(new OrderLog
            {
                FromStatus = null,
                ToStatus = "Pending",
                Note = "Order created",
                CreatedAt = DateTime.UtcNow,
            });

            _context.Orders.Add(order);
            ClearCheckoutCart(checkoutCart);

            await _context.SaveChangesAsync(cancellationToken);

            string? paymentUrl = null;
            if (paymentMethodId == 2)
            {
                paymentUrl = _vnPayService.CreatePaymentUrl(order);
                if (string.IsNullOrEmpty(paymentUrl))
                    throw new Exception("Could not create VNPay payment URL.");
            }

            return new CheckoutResult
            {
                OrderId = order.Id,
                PaymentUrl = paymentUrl,
                Message = paymentMethodId == 1
                    ? "Order created. Please pay on delivery."
                    : "Order created. Redirecting to payment gateway.",
            };
        }

        private async Task<decimal> AddCustomRequestItemAsync(
            Order order,
            CheckoutCommand request,
            CancellationToken cancellationToken)
        {
            if (!request.UserId.HasValue)
                throw new Exception("Please sign in to checkout a custom request.");

            var customRequest = await _context.CustomRequests
                .FirstOrDefaultAsync(cr => cr.Id == request.CustomRequestId && cr.UserId == request.UserId.Value, cancellationToken)
                ?? throw new Exception("Custom request was not found.");

            if (customRequest.Status != "Confirmed")
                throw new Exception("Custom request has not been confirmed.");

            if (customRequest.QuotedPrice == null)
                throw new Exception("Custom request does not have a quote.");

            order.CustomRequestId = customRequest.Id;
            order.OrderItems.Add(new OrderItem
            {
                ProductNameSnapshot = customRequest.Description ?? $"Custom request #{customRequest.Id}",
                VariantSnapshot = "",
                Quantity = 1,
                UnitPrice = customRequest.QuotedPrice.Value,
                CreatedAt = DateTime.UtcNow,
            });

            return customRequest.QuotedPrice.Value;
        }

        private async Task<Cart> GetCheckoutCartAsync(CheckoutCommand request, CancellationToken cancellationToken)
        {
            if (!request.UserId.HasValue && string.IsNullOrWhiteSpace(request.SessionId))
                throw new Exception("Cart session is required.");

            var cart = await _context.Carts
                .Include(c => c.CartItems)
                    .ThenInclude(ci => ci.ProductVariant)
                        .ThenInclude(v => v.Product)
                .Include(c => c.AppliedCombo)
                .FirstOrDefaultAsync(c =>
                    (request.UserId.HasValue && c.UserId == request.UserId.Value) ||
                    (!request.UserId.HasValue && !string.IsNullOrEmpty(request.SessionId) && c.SessionId == request.SessionId),
                    cancellationToken);

            if (cart == null || cart.CartItems.Count == 0)
                throw new Exception("Cart is empty or does not exist.");

            return cart;
        }

        private static (decimal Subtotal, decimal TotalWeightInGram) AddCartItems(Order order, Cart cart)
        {
            decimal subtotal = 0;
            decimal totalWeightInGram = 0;

            foreach (var item in cart.CartItems)
            {
                if (item.Quantity <= 0)
                    throw new Exception("Cart contains an invalid quantity.");

                var variant = item.ProductVariant
                    ?? throw new Exception($"Product variant {item.ProductVariantId} was not found.");

                if (!variant.IsActive || variant.Product?.IsActive != true)
                    throw new Exception($"Product variant {variant.Sku ?? variant.Id.ToString()} is not available.");

                if (variant.Quantity < item.Quantity)
                    throw new Exception($"Product variant {variant.Sku ?? variant.Id.ToString()} does not have enough stock.");

                order.OrderItems.Add(new OrderItem
                {
                    ProductVariantId = item.ProductVariantId,
                    ProductNameSnapshot = variant.Product?.Name ?? "",
                    VariantSnapshot = variant.Sku,
                    Quantity = item.Quantity,
                    UnitPrice = variant.Price,
                    CreatedAt = DateTime.UtcNow,
                });

                variant.Quantity -= item.Quantity;
                subtotal += variant.Price * item.Quantity;
                totalWeightInGram += (variant.Weight ?? 200m) * item.Quantity;
            }

            return (subtotal, Math.Max(totalWeightInGram, 1m));
        }

        private async Task<decimal> CalculateShippingFeeAsync(
            CheckoutCommand request,
            decimal totalWeightInGram,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.ShippingProvince) ||
                string.IsNullOrWhiteSpace(request.ShippingDistrict) ||
                string.IsNullOrWhiteSpace(request.ShippingWard))
            {
                throw new Exception("Shipping address is incomplete.");
            }

            var services = _shippingFeeServices.ToList();
            if (services.Count == 0)
                throw new Exception("No shipping fee service is configured.");

            if (!string.IsNullOrWhiteSpace(request.PreferredCarrierCode))
            {
                var selectedService = services.FirstOrDefault(s =>
                    string.Equals(s.CarrierCode, request.PreferredCarrierCode, StringComparison.OrdinalIgnoreCase));

                if (selectedService == null)
                    throw new Exception("Selected shipping carrier is not supported.");

                var selectedFee = await selectedService.CalculateFeeAsync(
                    request.ShippingProvince,
                    request.ShippingDistrict,
                    request.ShippingWard,
                    totalWeightInGram,
                    ct: cancellationToken);

                if (!selectedFee.IsSuccess)
                    throw new Exception(selectedFee.ErrorMessage ?? "Could not calculate shipping fee.");

                return selectedFee.Fee;
            }

            var feeResults = new List<ShippingFeeResult>();
            foreach (var service in services)
            {
                var fee = await service.CalculateFeeAsync(
                    request.ShippingProvince,
                    request.ShippingDistrict,
                    request.ShippingWard,
                    totalWeightInGram,
                    ct: cancellationToken);
                if (fee.IsSuccess)
                    feeResults.Add(fee);
            }

            var bestFee = feeResults.OrderBy(f => f.Fee).FirstOrDefault();
            if (bestFee == null)
                throw new Exception("Could not calculate shipping fee.");

            return bestFee.Fee;
        }

        private async Task<decimal> ApplyVoucherDiscountAsync(
            Order order,
            CheckoutCommand request,
            decimal subtotal,
            CancellationToken cancellationToken)
        {
            if (!request.VoucherId.HasValue)
                return 0;

            var now = DateTime.UtcNow;
            var voucher = await _context.Vouchers
                .Include(v => v.VoucherUsages)
                .FirstOrDefaultAsync(v =>
                    v.Id == request.VoucherId.Value &&
                    v.IsActive &&
                    v.StartDate <= now &&
                    v.EndDate >= now,
                    cancellationToken)
                ?? throw new Exception("Voucher is invalid or expired.");

            if (subtotal < voucher.MinOrderValue)
                throw new Exception("Order does not meet the voucher minimum value.");

            if (voucher.VoucherUsages.Count >= voucher.MaxUses)
                throw new Exception("Voucher has reached its usage limit.");

            if (request.UserId.HasValue)
            {
                var userUses = voucher.VoucherUsages.Count(vu => vu.UserId == request.UserId.Value);
                if (userUses >= voucher.MaxUsesPerUser)
                    throw new Exception("Voucher usage limit for this user has been reached.");
            }

            var discount = voucher.DiscountType == "Percentage"
                ? Math.Min(subtotal * voucher.DiscountValue / 100, voucher.MaxDiscountValue)
                : Math.Min(voucher.DiscountValue, subtotal);

            order.VoucherId = voucher.Id;
            order.VoucherDiscount = discount;

            if (request.UserId.HasValue)
            {
                order.VoucherUsages.Add(new VoucherUsage
                {
                    VoucherId = voucher.Id,
                    UserId = request.UserId.Value,
                    UsedAt = DateTime.UtcNow,
                });
            }

            return discount;
        }

        private async Task<decimal> ApplyComboDiscountAsync(
            Order order,
            Cart? cart,
            decimal subtotal,
            CancellationToken cancellationToken)
        {
            if (cart?.AppliedComboId == null)
                return 0;

            var combo = await _context.ProductCombos
                .Include(c => c.Items)
                    .ThenInclude(i => i.Product)
                        .ThenInclude(p => p.ProductVariants)
                .FirstOrDefaultAsync(c => c.Id == cart.AppliedComboId.Value, cancellationToken)
                ?? throw new Exception("Combo is invalid.");

            if (!combo.IsActive || (combo.MaxUses > 0 && combo.CurrentUses >= combo.MaxUses))
                throw new Exception("Combo is no longer available.");

            var cartProductIds = cart.CartItems
                .Select(i => i.ProductVariant.ProductId)
                .Distinct()
                .ToHashSet();

            var comboProductIds = combo.Items.Select(i => i.ProductId).ToList();
            if (comboProductIds.Count == 0 || !comboProductIds.All(cartProductIds.Contains))
                throw new Exception("Cart does not contain all combo products.");

            var originalPrice = combo.Items.Sum(i => i.Product.ProductVariants.Any()
                ? i.Product.ProductVariants.Min(v => v.Price)
                : 0m);

            var discount = combo.DiscountType switch
            {
                "Percentage" => Math.Round(originalPrice * combo.DiscountValue / 100m, 0),
                "Fixed" => Math.Max(0, combo.DiscountValue),
                _ => 0m,
            };

            discount = Math.Min(discount, subtotal);
            order.AppliedComboId = combo.Id;
            order.ComboDiscount = discount;
            combo.CurrentUses += 1;

            return discount;
        }

        private void ClearCheckoutCart(Cart? cart)
        {
            if (cart == null)
                return;

            foreach (var item in cart.CartItems.ToList())
                _context.CartItems.Remove(item);

            cart.AppliedComboId = null;

            if (!cart.UserId.HasValue)
                _context.Carts.Remove(cart);
        }
    }
}
