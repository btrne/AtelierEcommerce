namespace Atelier.Domain.Entities;

public class VoucherUsage
{
    public int Id { get; set; }
    public int VoucherId { get; set; }
    public int UserId { get; set; }
    public int OrderId { get; set; }
    public DateTime UsedAt { get; set; }
    
    public virtual Voucher Voucher { get; set; } = null!;
    public virtual User User { get; set; } = null!;
    public virtual Order Order { get; set; } = null!;
}
