namespace Atelier.Domain.Entities;

public class MessageImage
{
    public int Id { get; set; }
    public int MessageId { get; set; }
    public string ImageUrl { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public virtual Message Message { get; set; } = null!;
}
