using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.InventoryTransactions.Commands;

public class CreateInventoryTransactionCommand : IRequest<InventoryTransactionDto>
{
    public int ProductVariantId { get; set; }
    public string TransactionType { get; set; } = null!;
    public int Quantity { get; set; }
    public string? Note { get; set; }
}

public class CreateInventoryTransactionCommandHandler : IRequestHandler<CreateInventoryTransactionCommand, InventoryTransactionDto>
{
    private readonly IApplicationDbContext _context;

    public CreateInventoryTransactionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InventoryTransactionDto> Handle(CreateInventoryTransactionCommand request, CancellationToken cancellationToken)
    {
        var variant = await _context.ProductVariants
            .Include(pv => pv.Product)
            .FirstOrDefaultAsync(pv => pv.Id == request.ProductVariantId, cancellationToken);

        if (variant == null)
            throw new Exception($"Biến thể với ID = {request.ProductVariantId} không tồn tại.");

        if (request.TransactionType == "Adjustment" || request.TransactionType == "Import")
        {
            variant.Quantity += request.Quantity;
        }
        else if (request.TransactionType == "Export")
        {
            if (variant.Quantity < request.Quantity)
                throw new Exception($"Tồn kho không đủ. Hiện có: {variant.Quantity}, yêu cầu: {request.Quantity}");
            variant.Quantity -= request.Quantity;
        }
        else
        {
            throw new Exception("TransactionType phải là 'Import', 'Export' hoặc 'Adjustment'.");
        }

        var transaction = new InventoryTransaction
        {
            ProductVariantId = request.ProductVariantId,
            TransactionType = request.TransactionType,
            Quantity = request.Quantity,
            Note = request.Note,
            CreatedAt = DateTime.UtcNow,
        };

        _context.InventoryTransactions.Add(transaction);
        await _context.SaveChangesAsync(cancellationToken);

        return new InventoryTransactionDto
        {
            Id = transaction.Id,
            ProductVariantId = transaction.ProductVariantId,
            VariantSku = variant.Sku ?? "",
            ProductName = variant.Product.Name ?? "",
            TransactionType = transaction.TransactionType ?? "",
            Quantity = transaction.Quantity,
            Note = transaction.Note,
            CreatedAt = transaction.CreatedAt,
        };
    }
}
