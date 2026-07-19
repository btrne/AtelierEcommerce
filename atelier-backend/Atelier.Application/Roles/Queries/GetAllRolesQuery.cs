using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Roles.Queries;

public class GetAllRolesQuery : IRequest<PaginatedList<RoleDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllRolesQueryHandler : IRequestHandler<GetAllRolesQuery, PaginatedList<RoleDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllRolesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<RoleDto>> Handle(GetAllRolesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Roles
            .Include(r => r.UserRoles)
            .AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);

        var roles = await query
            .OrderBy(r => r.Name)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                Code = r.Code ?? "",
                Name = r.Name ?? "",
                IsActive = r.IsActive,
                UserCount = r.UserRoles.Count,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<RoleDto>(roles, totalCount, request.Page, request.PageSize);
    }
}
