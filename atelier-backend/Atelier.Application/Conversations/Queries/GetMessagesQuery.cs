using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Conversations.Queries;

public class GetMessagesQuery : IRequest<List<MessageDto>>
{
    public int ConversationId { get; set; }
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
