using Atelier.Application.Common.Interfaces;
using Atelier.Application.Common.Models;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.InventoryTransactions.Queries;

public class GetAllInventoryTransactionsQuery : IRequest<PaginatedList<InventoryTransactionDto>>
{
    public int? ProductVariantId { get; set; }
    public string? TransactionType { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}

public class GetAllInventoryTransactionsQueryHandler : IRequestHandler<GetAllInventoryTransactionsQuery, PaginatedList<InventoryTransactionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAllInventoryTransactionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<InventoryTransactionDto>> Handle(GetAllInventoryTransactionsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.InventoryTransactions
            .Include(it => it.ProductVariant).ThenInclude(pv => pv.Product)
            .AsQueryable();

        if (request.ProductVariantId.HasValue)
            query = query.Where(it => it.ProductVariantId == request.ProductVariantId.Value);

        if (!string.IsNullOrWhiteSpace(request.TransactionType))
            query = query.Where(it => it.TransactionType == request.TransactionType);

        var totalCount = await query.CountAsync(cancellationToken);

        var transactions = await query
            .OrderByDescending(it => it.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(it => new InventoryTransactionDto
            {
                Id = it.Id,
                ProductVariantId = it.ProductVariantId,
                VariantSku = it.ProductVariant.Sku ?? "",
                ProductName = it.ProductVariant.Product.Name ?? "",
                TransactionType = it.TransactionType ?? "",
                Quantity = it.Quantity,
                Note = it.Note,
                CreatedAt = it.CreatedAt,
            })
            .ToListAsync(cancellationToken);

        return new PaginatedList<InventoryTransactionDto>(transactions, totalCount, request.Page, request.PageSize);
    }
}
