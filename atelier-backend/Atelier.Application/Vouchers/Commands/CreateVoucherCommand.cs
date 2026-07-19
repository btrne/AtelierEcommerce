using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Vouchers.Commands;

public class CreateVoucherCommand : IRequest<VoucherAdminDto>
{
    public string Code { get; set; } = null!;
    public string? Description { get; set; }
    public string DiscountType { get; set; } = null!;
    public decimal DiscountValue { get; set; }
    public decimal MinOrderValue { get; set; }
    public decimal MaxDiscountValue { get; set; }
    public int MaxUses { get; set; }
    public int MaxUsesPerUser { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; } = true;
}

public class CreateVoucherCommandHandler : IRequestHandler<CreateVoucherCommand, VoucherAdminDto>
{
    private readonly IApplicationDbContext _context;

    public CreateVoucherCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<VoucherAdminDto> Handle(CreateVoucherCommand request, CancellationToken cancellationToken)
    {
        var existing = await _context.Vouchers
            .AnyAsync(v => v.Code == request.Code, cancellationToken);
        if (existing)
            throw new Exception($"Mã voucher '{request.Code}' đã tồn tại.");

        if (request.DiscountType != "Percentage" && request.DiscountType != "Fixed")
            throw new Exception("DiscountType phải là 'Percentage' hoặc 'Fixed'.");

        var voucher = new Voucher
        {
            Code = request.Code.ToUpper(),
            Description = request.Description,
            DiscountType = request.DiscountType,
            DiscountValue = request.DiscountValue,
            MinOrderValue = request.MinOrderValue,
            MaxDiscountValue = request.MaxDiscountValue,
            MaxUses = request.MaxUses,
            MaxUsesPerUser = request.MaxUsesPerUser,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Vouchers.Add(voucher);
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
            CurrentUses = 0,
            StartDate = voucher.StartDate,
            EndDate = voucher.EndDate,
            IsActive = voucher.IsActive,
            CreatedAt = voucher.CreatedAt,
        };
    }
}
