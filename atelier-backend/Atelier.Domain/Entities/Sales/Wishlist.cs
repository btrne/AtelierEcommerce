namespace Atelier.Domain.Entities;

public class Wishlist
{
    public int UserId { get; set; }
    public int ProductId { get; set; }
    public virtual User User { get; set; } = null!;
    public virtual Product Product { get; set; } = null!;
}