using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Vouchers.Queries;

public class ApplyVoucherQuery : IRequest<object?>
{
    public string Code { get; set; } = null!;
    public decimal OrderTotal { get; set; }
    public int? UserId { get; set; }
}

public class ApplyVoucherQueryHandler : IRequestHandler<ApplyVoucherQuery, object?>
{
    private readonly IApplicationDbContext _context;

    public ApplyVoucherQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<object?> Handle(ApplyVoucherQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        var voucher = await _context.Vouchers
            .Include(v => v.VoucherUsages)
            .FirstOrDefaultAsync(v =>
                v.Code == request.Code &&
                v.IsActive &&
                v.StartDate <= now &&
                v.EndDate >= now,
                cancellationToken);

        if (voucher == null)
            return null;

        if (request.OrderTotal < voucher.MinOrderValue)
            return new
            {
                valid = false,
                message = $"Đơn hàng tối thiểu {voucher.MinOrderValue:N0}đ để sử dụng voucher này.",
            };

        if (voucher.VoucherUsages.Count >= voucher.MaxUses)
            return new
            {
                valid = false,
                message = "Voucher đã hết lượt sử dụng.",
            };

        if (request.UserId.HasValue)
        {
            var userUses = voucher.VoucherUsages.Count(vu => vu.UserId == request.UserId.Value);
            if (userUses >= voucher.MaxUsesPerUser)
                return new
                {
                    valid = false,
                    message = "Bạn đã sử dụng voucher này quá số lần cho phép.",
                };
        }

        decimal discount = voucher.DiscountType == "Percentage"
            ? Math.Min(request.OrderTotal * voucher.DiscountValue / 100, voucher.MaxDiscountValue)
            : Math.Min(voucher.DiscountValue, request.OrderTotal);

        return new
        {
            valid = true,
            voucherId = voucher.Id,
            code = voucher.Code,
            discountType = voucher.DiscountType,
            discountValue = voucher.DiscountValue,
            discount,
            message = $"Giảm {discount:N0}đ",
        };
    }
}
