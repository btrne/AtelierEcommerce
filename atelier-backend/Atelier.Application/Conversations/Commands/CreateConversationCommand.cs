using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Conversations.Commands;

public class CreateConversationCommand : IRequest<int>
{
    public int UserId { get; set; }
    public string? Message { get; set; }
    public string Type { get; set; } = "Support";
}

public class CreateConversationCommandHandler : IRequestHandler<CreateConversationCommand, int>
{
    private readonly IApplicationDbContext _context;

    public CreateConversationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> Handle(CreateConversationCommand request, CancellationToken cancellationToken)
    {
        var conversation = new Conversation
        {
            UserId = request.UserId,
            Type = request.Type,
            StartedAt = DateTime.UtcNow,
            Title = string.IsNullOrEmpty(request.Message) ? null
                : (request.Message.Length > 80 ? request.Message[..80] + "..." : request.Message),
            Messages = new List<Message>(),
        };

        if (!string.IsNullOrEmpty(request.Message))
        {
            conversation.Messages.Add(new Message
            {
                Sender = "Customer",
                MessageText = request.Message,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync(cancellationToken);
        return conversation.Id;
    }
}
