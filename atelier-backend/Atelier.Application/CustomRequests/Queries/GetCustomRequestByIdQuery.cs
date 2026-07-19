using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.CustomRequests.Queries;

public class GetCustomRequestByIdQuery : IRequest<CustomRequestDto?>
{
    public int Id { get; set; }
    public int UserId { get; set; }
}

public class GetCustomRequestByIdQueryHandler : IRequestHandler<GetCustomRequestByIdQuery, CustomRequestDto?>
{
    private readonly IApplicationDbContext _context;

    public GetCustomRequestByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CustomRequestDto?> Handle(GetCustomRequestByIdQuery request, CancellationToken cancellationToken)
    {
        var cr = await _context.CustomRequests
            .FirstOrDefaultAsync(cr => cr.Id == request.Id && cr.UserId == request.UserId, cancellationToken);

        if (cr == null) return null;

        return new CustomRequestDto
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
        };
    }
}
