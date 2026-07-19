using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Conversations.Queries;

public class GetMyConversationsQuery : IRequest<List<ConversationDto>>
{
    public int UserId { get; set; }
    public string? Type { get; set; }
}

public class GetMyConversationsQueryHandler : IRequestHandler<GetMyConversationsQuery, List<ConversationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMyConversationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ConversationDto>> Handle(GetMyConversationsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Conversations
            .Include(c => c.Messages)
            .Where(c => c.UserId == request.UserId);

        if (!string.IsNullOrEmpty(request.Type))
        {
            query = query.Where(c => c.Type == request.Type);
        }

        var conversations = await query
            .OrderByDescending(c => c.Messages.Any() ? c.Messages.Max(m => m.CreatedAt) : c.StartedAt)
            .Select(c => new ConversationDto
            {
                Id = c.Id,
                UserId = c.UserId,
                Type = c.Type,
                Title = c.Title,
                LastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.MessageText).FirstOrDefault(),
                MessageCount = c.Messages.Count,
                StartedAt = c.StartedAt,
                LastMessageAt = c.Messages.Any() ? c.Messages.Max(m => (DateTime?)m.CreatedAt) : null,
            })
            .ToListAsync(cancellationToken);

        return conversations;
    }
}
