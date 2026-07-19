using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Combos.Commands;

public class UpdateComboCommand : IRequest
{
    public int Id { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public List<int>? ProductIds { get; set; }
    public string? DiscountType { get; set; }
    public decimal? DiscountValue { get; set; }
    public int? MaxUses { get; set; }
    public bool? IsActive { get; set; }
}

public class UpdateComboCommandHandler
    : IRequestHandler<UpdateComboCommand>
{
    private readonly IApplicationDbContext _context;

    public UpdateComboCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task Handle(UpdateComboCommand request, CancellationToken cancellationToken)
    {
        var combo = await _context.ProductCombos
            .Include(c => c.Items)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken)
            ?? throw new Exception("Không tìm thấy combo.");

        if (!string.IsNullOrEmpty(request.Name))
            combo.Name = request.Name;

        if (request.Description != null)
            combo.Description = request.Description;

        if (request.DiscountType != null)
            combo.DiscountType = request.DiscountType;

        if (request.DiscountValue.HasValue)
            combo.DiscountValue = request.DiscountValue.Value;

        if (request.MaxUses.HasValue)
            combo.MaxUses = request.MaxUses.Value;

        if (request.IsActive.HasValue)
            combo.IsActive = request.IsActive.Value;

        if (request.ProductIds != null)
        {
            var products = await _context.Products
                .Where(p => request.ProductIds.Contains(p.Id))
                .ToListAsync(cancellationToken);

            if (products.Count != request.ProductIds.Count)
                throw new Exception("Một số sản phẩm không tồn tại.");

            combo.Items.Clear();
            foreach (var productId in request.ProductIds)
            {
                combo.Items.Add(new Domain.Entities.ProductComboItem
                {
                    ProductId = productId,
                });
            }
        }

        combo.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);
    }
}
