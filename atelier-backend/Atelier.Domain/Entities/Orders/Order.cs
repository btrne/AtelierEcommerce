namespace Atelier.Domain.Entities;

public class Order
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public int? CustomRequestId { get; set; }
    public int PaymentMethodId { get; set; }
    public int? VoucherId { get; set; }
    public string OrderCode { get; set; } = null!;
    public string ShippingContactName { get; set; } = null!;
    public string ShippingPhone { get; set; } = null!;
    public string ShippingProvince { get; set; } = null!;
    public string ShippingDistrict { get; set; } = null!;
    public string ShippingWard { get; set; } = null!;
    public string ShippingDetail { get; set; } = null!;
    public decimal SubtotalAmount { get; set; }
    public decimal ShippingFee { get; set; }
    public string? PreferredCarrierCode { get; set; }
    public decimal? VoucherDiscount { get; set; }
    public int? AppliedComboId { get; set; }
    public decimal? ComboDiscount { get; set; }
    public decimal TotalAmount { get; set; }
    public string OrderStatus { get; set; } = null!;
    public DateTime? CancelledAt { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual User? User { get; set; }
    public virtual CustomRequest? CustomRequest { get; set; }
    public virtual PaymentMethod PaymentMethod { get; set; } = null!;
    public virtual Voucher? Voucher { get; set; }
    public virtual ProductCombo? AppliedCombo { get; set; }
    public virtual ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();
    public virtual ICollection<Payment> Payments { get; set; } = new List<Payment>();
    public virtual ICollection<VoucherUsage> VoucherUsages { get; set; } = new List<VoucherUsage>();
    public virtual ICollection<OrderLog> OrderLogs { get; set; } = new List<OrderLog>();
    public virtual ICollection<Shipment> Shipments { get; set; } = new List<Shipment>();
}
