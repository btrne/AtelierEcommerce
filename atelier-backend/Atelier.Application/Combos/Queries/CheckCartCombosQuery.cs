using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Combos.Queries;

public class CheckCartCombosQuery : IRequest<CartComboCheckResult>
{
    public List<int> ProductIds { get; set; } = new();
}

public class CheckCartCombosQueryHandler
    : IRequestHandler<CheckCartCombosQuery, CartComboCheckResult>
{
    private readonly IApplicationDbContext _context;

    public CheckCartCombosQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CartComboCheckResult> Handle(
        CheckCartCombosQuery request, CancellationToken cancellationToken)
    {
        var cartProductSet = request.ProductIds.ToHashSet();

        var combos = await _context.ProductCombos
            .Where(c => c.IsActive)
            .Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.ProductVariants)
            .ToListAsync(cancellationToken);

        var applicable = new List<ApplicableComboDto>();

        foreach (var combo in combos)
        {
            var comboProductIds = combo.Items.Select(i => i.ProductId).ToList();
            var matchingIds = comboProductIds.Where(id => cartProductSet.Contains(id)).ToList();
            var missingIds = comboProductIds.Where(id => !cartProductSet.Contains(id)).ToList();

            if (matchingIds.Count == 0) continue;

            var allInCart = missingIds.Count == 0;
            var originalPrice = CalculateOriginalTotal(combo);
            var comboPrice = CalculateComboPrice(combo);
            var discount = originalPrice - comboPrice;

            applicable.Add(new ApplicableComboDto
            {
                ComboId = combo.Id,
                ComboName = combo.Name,
                MatchingProductIds = matchingIds,
                MissingProductIds = missingIds,
                DiscountAmount = discount,
                ComboPrice = comboPrice,
                OriginalPrice = originalPrice,
                AllItemsInCart = allInCart,
            });
        }

        applicable = applicable
            .OrderByDescending(c => c.AllItemsInCart)
            .ThenByDescending(c => c.MatchingProductIds.Count)
            .ToList();

        return new CartComboCheckResult { ApplicableCombos = applicable };
    }

    private static decimal CalculateOriginalTotal(Domain.Entities.ProductCombo combo)
    {
        return combo.Items.Sum(i => i.Product.ProductVariants.Any()
            ? i.Product.ProductVariants.Min(v => v.Price)
            : 0m);
    }

    private static decimal CalculateComboPrice(Domain.Entities.ProductCombo combo)
    {
        var original = CalculateOriginalTotal(combo);
        return combo.DiscountType switch
        {
            "Percentage" => Math.Round(original * (1 - combo.DiscountValue / 100m), 0),
            "Fixed" => Math.Max(0, original - combo.DiscountValue),
            _ => original,
        };
    }
}
