using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.PaymentMethods.Commands;

public class UpdatePaymentMethodCommand : IRequest<PaymentMethodDto>
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdatePaymentMethodCommandHandler : IRequestHandler<UpdatePaymentMethodCommand, PaymentMethodDto>
{
    private readonly IApplicationDbContext _context;

    public UpdatePaymentMethodCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentMethodDto> Handle(UpdatePaymentMethodCommand request, CancellationToken cancellationToken)
    {
        var method = await _context.PaymentMethods
            .FirstOrDefaultAsync(pm => pm.Id == request.Id, cancellationToken);

        if (method == null)
            throw new Exception($"Không tìm thấy phương thức thanh toán với ID = {request.Id}");

        if (request.Name != null)
            method.Name = request.Name;

        if (request.IsActive.HasValue)
            method.IsActive = request.IsActive.Value;

        await _context.SaveChangesAsync(cancellationToken);

        return new PaymentMethodDto
        {
            Id = method.Id,
            Name = method.Name ?? "",
            IsActive = method.IsActive,
        };
    }
}
