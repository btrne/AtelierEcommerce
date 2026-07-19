using Atelier.Application.DTOs;
using MediatR;

namespace Atelier.Application.Orders.Commands
{
    public class CheckoutCommand : IRequest<CheckoutResult>
    {
        public int? UserId { get; set; }
        public string? SessionId { get; set; }

        public string RecipientName { get; set; } = null!;
        public string RecipientPhone { get; set; } = null!;
        public string ShippingAddress { get; set; } = null!;
        public string ShippingProvince { get; set; } = "";
        public string ShippingDistrict { get; set; } = "";
        public string ShippingWard { get; set; } = "";

        public decimal ShippingFee { get; set; }
        public string? PreferredCarrierCode { get; set; }
        public int? PaymentMethodId { get; set; }
        public string? Notes { get; set; }
        public int? VoucherId { get; set; }
        public decimal? VoucherDiscount { get; set; }
        public int? AppliedComboId { get; set; }
        public decimal? ComboDiscount { get; set; }
        public List<CheckoutItem>? CartItems { get; set; }
        public int? CustomRequestId { get; set; }
    }

    public class CheckoutItem
    {
        public int ProductVariantId { get; set; }
        public int Quantity { get; set; }
    }
}