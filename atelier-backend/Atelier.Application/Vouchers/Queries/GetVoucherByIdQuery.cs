using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Vouchers.Queries;

public class GetVoucherByIdQuery : IRequest<VoucherAdminDto?>
{
    public int Id { get; set; }
    public GetVoucherByIdQuery(int id) { Id = id; }
}

public class GetVoucherByIdQueryHandler : IRequestHandler<GetVoucherByIdQuery, VoucherAdminDto?>
{
    private readonly IApplicationDbContext _context;

    public GetVoucherByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<VoucherAdminDto?> Handle(GetVoucherByIdQuery request, CancellationToken cancellationToken)
    {
        var voucher = await _context.Vouchers
            .Include(v => v.VoucherUsages)
            .Where(v => v.Id == request.Id)
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
            .FirstOrDefaultAsync(cancellationToken);

        return voucher;
    }
}
