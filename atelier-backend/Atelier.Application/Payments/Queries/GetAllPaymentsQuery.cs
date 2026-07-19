using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Payments.Queries;

public class GetAllPaymentsQuery : IRequest<PaginatedList<PaymentDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllPaymentsQueryHandler : IRequestHandler<GetAllPaymentsQuery, PaginatedList<PaymentDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllPaymentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<PaymentDto>> Handle(GetAllPaymentsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Payments.AsQueryable();

        var totalCount = await query.CountAsync(cancellationToken);

        var payments = await query
            .OrderByDescending(p => p.Id)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new PaymentDto
            {
                Id = p.Id,
                TransactionCode = p.TransactionCode,
                Amount = p.Amount,
                Status = p.Status ?? "",
                PaidAt = p.PaidAt,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<PaymentDto>(payments, totalCount, request.Page, request.PageSize);
    }
}
