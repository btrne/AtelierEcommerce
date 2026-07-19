using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Conversations.Queries;

public class GetAllConversationsQuery : IRequest<PaginatedList<ConversationDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Type { get; set; }
    public string? Search { get; set; }
    public bool? HasCustomRequests { get; set; }
}

public class GetAllConversationsQueryHandler : IRequestHandler<GetAllConversationsQuery, PaginatedList<ConversationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllConversationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ConversationDto>> Handle(GetAllConversationsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Conversations
            .Include(c => c.User)
            .Include(c => c.Messages)
            .AsQueryable();

        if (!string.IsNullOrEmpty(request.Type))
        {
            query = query.Where(c => c.Type == request.Type);
        }

        if (!string.IsNullOrEmpty(request.Search))
        {
            var search = request.Search.ToLower();
            query = query.Where(c => c.User.FullName != null && c.User.FullName.ToLower().Contains(search)
                || c.User.Email.ToLower().Contains(search));
        }

        if (request.HasCustomRequests == true)
        {
            query = query.Where(c => _context.CustomRequests.Any(cr => cr.ConversationId == c.Id));
        }

        var totalCount = await query.CountAsync(cancellationToken);

        var conversations = await query
            .OrderByDescending(c => c.Messages.Any() ? c.Messages.Max(m => m.CreatedAt) : c.StartedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(c => new ConversationDto
            {
                Id = c.Id,
                UserId = c.UserId,
                UserName = c.User.FullName ?? c.User.Email,
                Type = c.Type,
                Title = c.Title,
                LastMessage = c.Messages.OrderByDescending(m => m.CreatedAt).Select(m => m.MessageText).FirstOrDefault(),
                MessageCount = c.Messages.Count,
                StartedAt = c.StartedAt,
                LastMessageAt = c.Messages.Any() ? c.Messages.Max(m => (DateTime?)m.CreatedAt) : null,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<ConversationDto>(conversations, totalCount, request.Page, request.PageSize);
    }
}
