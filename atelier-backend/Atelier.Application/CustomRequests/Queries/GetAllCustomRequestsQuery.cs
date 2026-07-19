using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.CustomRequests.Queries;

public class GetAllCustomRequestsQuery : IRequest<PaginatedList<CustomRequestAdminDto>>
{
    public string? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllCustomRequestsQueryHandler : IRequestHandler<GetAllCustomRequestsQuery, PaginatedList<CustomRequestAdminDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllCustomRequestsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<CustomRequestAdminDto>> Handle(GetAllCustomRequestsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.CustomRequests
            .Include(cr => cr.User)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Status))
            query = query.Where(cr => cr.Status == request.Status);

        var totalCount = await query.CountAsync(cancellationToken);

        var requests = await query
            .OrderByDescending(cr => cr.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(cr => new CustomRequestAdminDto
            {
                Id = cr.Id,
                UserId = cr.UserId,
                UserName = cr.User.FullName ?? cr.User.Email,
                Description = cr.Description,
                QuotedPrice = cr.QuotedPrice,
                EstimatedFinishDate = cr.EstimatedFinishDate,
                Status = cr.Status ?? "",
                ConversationId = cr.ConversationId,
                CustomerConfirmedAt = cr.CustomerConfirmedAt,
                StartedAt = cr.StartedAt,
                FinishedAt = cr.FinishedAt,
                CancelledAt = cr.CancelledAt,
                CreatedAt = cr.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<CustomRequestAdminDto>(requests, totalCount, request.Page, request.PageSize);
    }
}
