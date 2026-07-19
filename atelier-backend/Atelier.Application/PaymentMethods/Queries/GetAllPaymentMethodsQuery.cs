using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.PaymentMethods.Queries;

public class GetAllPaymentMethodsQuery : IRequest<PaginatedList<PaymentMethodDto>>
{
    public bool? IsActive { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllPaymentMethodsQueryHandler : IRequestHandler<GetAllPaymentMethodsQuery, PaginatedList<PaymentMethodDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllPaymentMethodsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<PaymentMethodDto>> Handle(GetAllPaymentMethodsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.PaymentMethods.AsQueryable();

        if (request.IsActive.HasValue)
            query = query.Where(pm => pm.IsActive == request.IsActive.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var methods = await query
            .OrderBy(pm => pm.Name)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(pm => new PaymentMethodDto
            {
                Id = pm.Id,
                Name = pm.Name ?? "",
                IsActive = pm.IsActive,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<PaymentMethodDto>(methods, totalCount, request.Page, request.PageSize);
    }
}
