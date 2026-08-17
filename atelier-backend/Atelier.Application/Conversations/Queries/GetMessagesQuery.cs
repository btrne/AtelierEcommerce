using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Conversations.Queries;

public class GetMessagesQuery : IRequest<List<MessageDto>>
{
    public int ConversationId { get; set; }
    public int? UserId { get; set; }
    public bool CanAccessAll { get; set; }
}

public class GetMessagesQueryHandler : IRequestHandler<GetMessagesQuery, List<MessageDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMessagesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<MessageDto>> Handle(GetMessagesQuery request, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .AsNoTracking()
            .Where(c => c.Id == request.ConversationId)
            .Select(c => new { c.UserId })
            .FirstOrDefaultAsync(cancellationToken);

        if (conversation == null)
            throw new Exception($"Không tìm thấy hội thoại với ID = {request.ConversationId}");

        if (!request.CanAccessAll && (!request.UserId.HasValue || conversation.UserId != request.UserId.Value))
            throw new UnauthorizedAccessException("Conversation does not belong to the current user.");

        var messages = await _context.Messages
            .Where(m => m.ConversationId == request.ConversationId)
            .OrderBy(m => m.CreatedAt)
            .Select(m => new MessageDto
            {
                Id = m.Id,
                ConversationId = m.ConversationId,
                Sender = m.Sender ?? "",
                MessageText = m.MessageText ?? "",
                ImageUrls = m.Images.Select(i => i.ImageUrl).ToList(),
                ProductSuggestions = m.ProductSuggestions.Select(ps => new AiProductSuggestion
                {
                    Id = ps.ProductId,
                    Name = ps.ProductName,
                    Description = ps.Description,
                    Price = ps.Price,
                    PriceMin = ps.PriceMin,
                    PriceMax = ps.PriceMax,
                    ImageUrl = ps.ImageUrl,
                    Slug = ps.Slug,
                    CategoryName = ps.CategoryName,
                }).ToList(),
                CreatedAt = m.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return messages;
    }
}
