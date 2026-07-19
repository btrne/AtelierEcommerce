using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.PaymentMethods.Commands;

public class CreatePaymentMethodCommand : IRequest<PaymentMethodDto>
{
    public string Name { get; set; } = null!;
    public bool IsActive { get; set; } = true;
}

public class CreatePaymentMethodCommandHandler : IRequestHandler<CreatePaymentMethodCommand, PaymentMethodDto>
{
    private readonly IApplicationDbContext _context;

    public CreatePaymentMethodCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaymentMethodDto> Handle(CreatePaymentMethodCommand request, CancellationToken cancellationToken)
    {
        var exists = await _context.PaymentMethods.AnyAsync(pm => pm.Name == request.Name, cancellationToken);
        if (exists)
            throw new Exception($"Phương thức thanh toán '{request.Name}' đã tồn tại.");

        var method = new PaymentMethod
        {
            Name = request.Name,
            IsActive = request.IsActive,
        };

        _context.PaymentMethods.Add(method);
        await _context.SaveChangesAsync(cancellationToken);

        return new PaymentMethodDto
        {
            Id = method.Id,
            Name = method.Name ?? "",
            IsActive = method.IsActive,
        };
    }
}
