namespace Atelier.Domain.Entities;

public class Message
{
    public int Id { get; set; }
    public int ConversationId { get; set; }
    public string Sender { get; set; } = null!;
    public string MessageText { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public virtual Conversation Conversation { get; set; } = null!;
    public virtual ICollection<MessageImage> Images { get; set; } = new List<MessageImage>();
    public virtual ICollection<MessageProductSuggestion> ProductSuggestions { get; set; } = new List<MessageProductSuggestion>();
}
