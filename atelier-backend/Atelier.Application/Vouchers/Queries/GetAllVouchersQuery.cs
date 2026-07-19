using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Vouchers.Queries;

public class GetAllVouchersQuery : IRequest<PaginatedList<VoucherAdminDto>>
{
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllVouchersQueryHandler : IRequestHandler<GetAllVouchersQuery, PaginatedList<VoucherAdminDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllVouchersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<VoucherAdminDto>> Handle(GetAllVouchersQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Vouchers
            .Include(v => v.VoucherUsages)
            .AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(v => v.IsActive == request.IsActive.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var vouchers = await query
            .OrderByDescending(v => v.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(v => new VoucherAdminDto
            {
                Id = v.Id,
                Code = v.Code ?? "",
                Description = v.Description,
                DiscountType = v.DiscountType ?? "",
                DiscountValue = v.DiscountValue,
                MinOrderValue = v.MinOrderValue,
                MaxDiscountValue = v.MaxDiscountValue,
                MaxUses = v.MaxUses,
                MaxUsesPerUser = v.MaxUsesPerUser,
                CurrentUses = v.VoucherUsages.Count,
                StartDate = v.StartDate,
                EndDate = v.EndDate,
                IsActive = v.IsActive,
                CreatedAt = v.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<VoucherAdminDto>(vouchers, totalCount, request.Page, request.PageSize);
    }
}
