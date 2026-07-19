namespace Atelier.Application.DTOs;

public class OrderAdminDto
{
    public int Id { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public string ShippingContactName { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;
    public string ShippingAddress { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = string.Empty;
    public decimal SubtotalAmount { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal? VoucherDiscount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? PaymentMethodName { get; set; }
    public string? PaymentStatus { get; set; }
    public DateTime? PaidAt { get; set; }
    public int ItemCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
}

public class OrderDetailAdminDto
{
    public int Id { get; set; }
    public string OrderCode { get; set; } = string.Empty;
    public int? UserId { get; set; }
    public string? CustomerName { get; set; }
    public string? CustomerEmail { get; set; }
    public string? CustomerPhone { get; set; }
    public string ShippingContactName { get; set; } = string.Empty;
    public string ShippingPhone { get; set; } = string.Empty;
    public string ShippingProvince { get; set; } = string.Empty;
    public string ShippingDistrict { get; set; } = string.Empty;
    public string ShippingWard { get; set; } = string.Empty;
    public string ShippingDetail { get; set; } = string.Empty;
    public string OrderStatus { get; set; } = string.Empty;
    public string? PreferredCarrierCode { get; set; }
    public decimal SubtotalAmount { get; set; }
    public decimal ShippingFee { get; set; }
    public decimal? VoucherDiscount { get; set; }
    public decimal TotalAmount { get; set; }
    public string? VoucherCode { get; set; }
    public string? PaymentMethodName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public List<OrderItemAdminDto> Items { get; set; } = new();
    public List<PaymentDto> Payments { get; set; } = new();
    public List<OrderLogDto> OrderLogs { get; set; } = new();
}

public class OrderItemAdminDto
{
    public int Id { get; set; }
    public int? ProductVariantId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string VariantName { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? ImageUrl { get; set; }
}

public class PaymentDto
{
    public int Id { get; set; }
    public string? TransactionCode { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? PaidAt { get; set; }
}
