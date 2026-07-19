using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.CustomRequests.Queries;

public class GetMyCustomRequestsQuery : IRequest<List<CustomRequestDto>>
{
    public int UserId { get; set; }
}

public class GetMyCustomRequestsQueryHandler : IRequestHandler<GetMyCustomRequestsQuery, List<CustomRequestDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMyCustomRequestsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<CustomRequestDto>> Handle(GetMyCustomRequestsQuery request, CancellationToken cancellationToken)
    {
        return await _context.CustomRequests
            .Where(cr => cr.UserId == request.UserId)
            .OrderByDescending(cr => cr.CreatedAt)
            .Select(cr => new CustomRequestDto
            {
                Id = cr.Id,
                UserId = cr.UserId,
                Description = cr.Description,
                ImageUrl = cr.ImageUrl,
                QuotedPrice = cr.QuotedPrice,
                EstimatedFinishDate = cr.EstimatedFinishDate,
                Status = cr.Status ?? "",
                CustomerConfirmedAt = cr.CustomerConfirmedAt,
                ConversationId = cr.ConversationId,
                CreatedAt = cr.CreatedAt,
            })
            .ToListAsync(cancellationToken);
    }
}
