namespace Atelier.Domain.Entities;

public class UserEvent
{
    public long Id { get; set; }
    public int? UserId { get; set; }
    public string? SessionId { get; set; }
    public string EventType { get; set; } = null!;
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public string? Data { get; set; }
    public DateTime CreatedAt { get; set; }

    public virtual User? User { get; set; }
}
