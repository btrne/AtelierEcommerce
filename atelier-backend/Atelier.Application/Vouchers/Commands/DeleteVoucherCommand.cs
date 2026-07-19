using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Vouchers.Commands;

public class DeleteVoucherCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteVoucherCommand(int id) { Id = id; }
}

public class DeleteVoucherCommandHandler : IRequestHandler<DeleteVoucherCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteVoucherCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteVoucherCommand request, CancellationToken cancellationToken)
    {
        var voucher = await _context.Vouchers
            .Include(v => v.VoucherUsages)
            .FirstOrDefaultAsync(v => v.Id == request.Id, cancellationToken);

        if (voucher == null)
            throw new Exception($"Không tìm thấy voucher với ID = {request.Id}");

        if (voucher.VoucherUsages.Any())
            throw new Exception($"Không thể xóa voucher '{voucher.Code}' vì đã được sử dụng. Hãy tắt (IsActive = false) thay vì xóa.");

        _context.Vouchers.Remove(voucher);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
