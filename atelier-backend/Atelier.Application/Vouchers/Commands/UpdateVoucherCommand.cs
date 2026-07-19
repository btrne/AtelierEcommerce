using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Vouchers.Commands;

public class UpdateVoucherCommand : IRequest<VoucherAdminDto>
{
    public int Id { get; set; }
    public string? Code { get; set; }
    public string? Description { get; set; }
    public string? DiscountType { get; set; }
    public decimal? DiscountValue { get; set; }
    public decimal? MinOrderValue { get; set; }
    public decimal? MaxDiscountValue { get; set; }
    public int? MaxUses { get; set; }
    public int? MaxUsesPerUser { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateVoucherCommandHandler : IRequestHandler<UpdateVoucherCommand, VoucherAdminDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateVoucherCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<VoucherAdminDto> Handle(UpdateVoucherCommand request, CancellationToken cancellationToken)
    {
        var voucher = await _context.Vouchers
            .Include(v => v.VoucherUsages)
            .FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);

        if (voucher == null)
            throw new Exception($"Không tìm thấy voucher với ID = {request.Id}");

        if (request.Code != null)
        {
            var exists = await _context.Vouchers
                .AnyAsync(v => v.Code == request.Code && v.Id != request.Id, cancellationToken);
            if (exists)
                throw new Exception($"Mã voucher '{request.Code}' đã tồn tại.");
            voucher.Code = request.Code.ToUpper();
        }

        if (request.Description != null)
            voucher.Description = request.Description;

        if (request.DiscountType != null)
        {
            if (request.DiscountType != "Percentage" && request.DiscountType != "Fixed")
                throw new Exception("DiscountType phải là 'Percentage' hoặc 'Fixed'.");
            voucher.DiscountType = request.DiscountType;
        }

        if (request.DiscountValue.HasValue)
            voucher.DiscountValue = request.DiscountValue.Value;

        if (request.MinOrderValue.HasValue)
            voucher.MinOrderValue = request.MinOrderValue.Value;

        if (request.MaxDiscountValue.HasValue)
            voucher.MaxDiscountValue = request.MaxDiscountValue.Value;

        if (request.MaxUses.HasValue)
            voucher.MaxUses = request.MaxUses.Value;

        if (request.MaxUsesPerUser.HasValue)
            voucher.MaxUsesPerUser = request.MaxUsesPerUser.Value;

        if (request.StartDate.HasValue)
            voucher.StartDate = request.StartDate.Value;

        if (request.EndDate.HasValue)
            voucher.EndDate = request.EndDate.Value;

        if (request.IsActive.HasValue)
            voucher.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        return new VoucherAdminDto
        {
            Id = voucher.Id,
            Code = voucher.Code ?? "",
            Description = voucher.Description,
            DiscountType = voucher.DiscountType ?? "",
            DiscountValue = voucher.DiscountValue,
            MinOrderValue = voucher.MinOrderValue,
            MaxDiscountValue = voucher.MaxDiscountValue,
            MaxUses = voucher.MaxUses,
            MaxUsesPerUser = voucher.MaxUsesPerUser,
            CurrentUses = voucher.VoucherUsages.Count,
            StartDate = voucher.StartDate,
            EndDate = voucher.EndDate,
            IsActive = voucher.IsActive,
            CreatedAt = voucher.CreatedAt,
        };
    }
}
