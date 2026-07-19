namespace Atelier.Domain.Entities;

public class Conversation
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Type { get; set; } = "Support";
    public string? Title { get; set; }
    public DateTime StartedAt { get; set; }
    public virtual User User { get; set; } = null!;
    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}
