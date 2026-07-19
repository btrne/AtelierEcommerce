using MediatR;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;

namespace Atelier.Application.Vouchers.Queries;

public class GetActiveVouchersQuery : IRequest<List<ActiveVoucherDto>> { }

public class ActiveVoucherDto
{
    public string Code { get; set; } = null!;
    public string? Description { get; set; }
    public string DiscountType { get; set; } = null!;
    public decimal DiscountValue { get; set; }
    public decimal MinOrderValue { get; set; }
    public decimal MaxDiscountValue { get; set; }
}

public class GetActiveVouchersQueryHandler : IRequestHandler<GetActiveVouchersQuery, List<ActiveVoucherDto>>
{
    private readonly IApplicationDbContext _context;

    public GetActiveVouchersQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ActiveVoucherDto>> Handle(GetActiveVouchersQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        return await _context.Vouchers
            .Where(v => v.IsActive && v.StartDate <= now && v.EndDate >= now)
            .Select(v => new ActiveVoucherDto
            {
                Code = v.Code,
                Description = v.Description,
                DiscountType = v.DiscountType,
                DiscountValue = v.DiscountValue,
                MinOrderValue = v.MinOrderValue,
                MaxDiscountValue = v.MaxDiscountValue,
            })
            .ToListAsync(cancellationToken);
    }
}
