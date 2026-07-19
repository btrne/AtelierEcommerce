using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Users.Queries;

public class GetAllUsersQuery : IRequest<PaginatedList<UserAdminDto>>
{
    public string? Search { get; set; }
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllUsersQueryHandler : IRequestHandler<GetAllUsersQuery, PaginatedList<UserAdminDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllUsersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<UserAdminDto>> Handle(GetAllUsersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Users
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Include(u => u.Orders)
            .AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(u => u.IsActive == request.IsActive.Value);

        if (!string.IsNullOrWhiteSpace(request.Search))
            query = query.Where(u =>
                u.FullName.Contains(request.Search) ||
                u.Email.Contains(request.Search) ||
                u.Phone.Contains(request.Search));

        var totalCount = await query.CountAsync(cancellationToken);

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(u => new UserAdminDto
            {
                Id = u.Id,
                Email = u.Email ?? "",
                FullName = u.FullName ?? "",
                Phone = u.Phone ?? "",
                IsActive = u.IsActive,
                CreatedAt = u.CreatedAt,
                OrderCount = u.Orders.Count,
                TotalSpent = u.Orders.Where(o => o.OrderStatus == "Completed").Sum(o => (decimal?)o.TotalAmount) ?? 0,
                Roles = u.UserRoles.Select(ur => ur.Role.Name ?? "").ToList(),
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<UserAdminDto>(users, totalCount, request.Page, request.PageSize);
    }
}
