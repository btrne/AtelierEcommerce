using System.ComponentModel.DataAnnotations;

namespace Atelier.Domain.Entities;

public class Rating
{
    public int Id { get; set; }
    public int OrderItemId { get; set; }
    public int UserId { get; set; }
    [Range(1, 5)]
    public int Stars { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }
    public virtual OrderItem OrderItem { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}
