namespace Atelier.Domain.Entities;

public class OrderLog
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public string? FromStatus { get; set; }
    public string ToStatus { get; set; } = null!;
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual Order Order { get; set; } = null!;
}
