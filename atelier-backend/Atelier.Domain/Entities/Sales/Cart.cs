namespace Atelier.Domain.Entities;

public class Cart
{
    public int Id { get; set; }
    public int? UserId { get; set; }
    public string? SessionId { get; set; }
    public int? AppliedComboId { get; set; }
    public virtual User? User { get; set; }
    public virtual ProductCombo? AppliedCombo { get; set; }
    public virtual ICollection<CartItem> CartItems { get; set; } = new List<CartItem>();
}
