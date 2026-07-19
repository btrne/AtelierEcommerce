namespace Atelier.Domain.Entities;

public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public int PaymentMethodId { get; set; }
    public string? TransactionCode { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = null!;
    public DateTime? PaidAt { get; set; }
    public virtual Order Order { get; set; } = null!;
    public virtual PaymentMethod PaymentMethod { get; set; } = null!;
}
