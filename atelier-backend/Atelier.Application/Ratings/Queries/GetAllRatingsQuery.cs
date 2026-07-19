using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Ratings.Queries;

public class GetAllRatingsQuery : IRequest<PaginatedList<RatingAdminDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllRatingsQueryHandler : IRequestHandler<GetAllRatingsQuery, PaginatedList<RatingAdminDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllRatingsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<RatingAdminDto>> Handle(GetAllRatingsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Ratings
            .Include(r => r.User)
            .Include(r => r.OrderItem).ThenInclude(oi => oi.ProductVariant).ThenInclude(pv => pv.Product)
            .AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);

        var ratings = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(r => new RatingAdminDto
            {
                Id = r.Id,
                UserId = r.UserId,
                UserName = r.User.FullName ?? r.User.Email,
                ProductName = r.OrderItem.ProductVariant.Product.Name ?? "",
                Stars = r.Stars,
                Comment = r.Comment,
                CreatedAt = r.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<RatingAdminDto>(ratings, totalCount, request.Page, request.PageSize);
    }
}
