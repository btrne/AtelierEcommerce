using MediatR;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;

namespace Atelier.Application.Carts.Queries
{
    public class GetCartQueryHandler : IRequestHandler<GetCartQuery, object>
    {
        private readonly IApplicationDbContext _context;

        public GetCartQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<object?> Handle(GetCartQuery request, CancellationToken cancellationToken)
        {
            var cart = await _context.Carts
                .AsNoTracking()
                .Where(c => (request.UserId.HasValue && c.UserId == request.UserId) ||
                            (!string.IsNullOrEmpty(request.SessionId) && c.SessionId == request.SessionId))
                .Select(c => new
                {
                    c.Id,
                    c.UserId,
                    c.SessionId,
                    Items = _context.CartItems
                        .Where(ci => ci.CartId == c.Id)
                        .Select(ci => new
                        {
                            ci.Id,
                            ci.ProductVariantId,
                            ci.Quantity,
                            Price = _context.ProductVariants.FirstOrDefault(pv => pv.Id == ci.ProductVariantId)!.Price,
                            Sku = _context.ProductVariants.FirstOrDefault(pv => pv.Id == ci.ProductVariantId)!.Sku,
                            ProductName = _context.ProductVariants.FirstOrDefault(pv => pv.Id == ci.ProductVariantId)!.Product.Name,
                            ProductSlug = _context.ProductVariants.FirstOrDefault(pv => pv.Id == ci.ProductVariantId)!.Product.Slug,
                            ProductId = _context.ProductVariants.FirstOrDefault(pv => pv.Id == ci.ProductVariantId)!.Product.Id,
                            ThumbnailUrl = _context.ProductVariants
                                .Where(pv => pv.Id == ci.ProductVariantId)
                                .SelectMany(pv => pv.ProductVariantImages)
                                .OrderByDescending(img => img.IsPrimary == true)
                                .Select(img => img.ImageUrl)
                                .FirstOrDefault()
                        }).ToList()
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (cart == null) return null;

            var totalAmount = cart.Items.Sum(i => i.Price * i.Quantity);
            var cartProductIds = cart.Items.Select(i => i.ProductId).Distinct().ToList();

            // Validate applied combo
            object? comboInfo = null;
            var cartEntity = await _context.Carts
                .Include(c => c.AppliedCombo)
                .FirstOrDefaultAsync(c => c.Id == cart.Id, cancellationToken);

            if (cartEntity?.AppliedCombo != null)
            {
                var combo = cartEntity.AppliedCombo;
                var comboProductIds = await _context.ProductComboItems
                    .Where(ci => ci.ProductComboId == combo.Id)
                    .Select(ci => ci.ProductId)
                    .ToListAsync(cancellationToken);

                var allInCart = comboProductIds.All(id => cartProductIds.Contains(id));

                if (!allInCart)
                {
                    cartEntity.AppliedComboId = null;
                    await _context.SaveChangesAsync(cancellationToken);
                }
                else
                {
                    var originalPrice = await _context.ProductComboItems
                        .Where(ci => ci.ProductComboId == combo.Id)
                        .Select(ci => ci.Product.ProductVariants.Min(v => (decimal?)v.Price) ?? 0m)
                        .SumAsync(cancellationToken);

                    var discount = combo.DiscountType switch
                    {
                        "Percentage" => Math.Round(originalPrice * combo.DiscountValue / 100m, 0),
                        "Fixed" => Math.Max(0, combo.DiscountValue),
                        _ => 0m,
                    };

                    comboInfo = new
                    {
                        ComboId = combo.Id,
                        ComboName = combo.Name,
                        OriginalPrice = originalPrice,
                        ComboPrice = originalPrice - discount,
                        DiscountAmount = discount,
                    };
                }
            }

            // Find suggested combos
            var suggestedCombos = new List<object>();
            var activeCombos = await _context.ProductCombos
                .Where(c => c.IsActive)
                .Include(c => c.Items).ThenInclude(i => i.Product).ThenInclude(p => p.ProductVariants)
                .ToListAsync(cancellationToken);

            foreach (var combo in activeCombos)
            {
                var comboProdIds = combo.Items.Select(i => i.ProductId).ToList();
                var matchingIds = comboProdIds.Where(id => cartProductIds.Contains(id)).ToList();
                if (matchingIds.Count == 0) continue;

                var allIn = comboProdIds.All(id => cartProductIds.Contains(id));
                if (allIn && comboInfo != null) continue;

                var origPrice = combo.Items.Sum(i => i.Product.ProductVariants.Any()
                    ? i.Product.ProductVariants.Min(v => v.Price) : 0m);
                var disc = combo.DiscountType switch
                {
                    "Percentage" => Math.Round(origPrice * combo.DiscountValue / 100m, 0),
                    "Fixed" => Math.Max(0, combo.DiscountValue),
                    _ => 0m,
                };

                suggestedCombos.Add(new
                {
                    ComboId = combo.Id,
                    ComboName = combo.Name,
                    OriginalPrice = origPrice,
                    ComboPrice = origPrice - disc,
                    DiscountAmount = disc,
                    AllItemsInCart = allIn,
                    MatchingCount = matchingIds.Count,
                    TotalCount = comboProdIds.Count,
                });
            }

            return new
            {
                CartInfo = cart,
                TotalAmount = totalAmount,
                AppliedCombo = comboInfo,
                SuggestedCombos = suggestedCombos,
            };
        }
    }
}
