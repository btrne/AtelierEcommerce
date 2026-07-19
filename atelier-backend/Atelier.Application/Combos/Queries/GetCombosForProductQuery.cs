using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Combos.Queries;

public class GetCombosForProductQuery : IRequest<List<ProductComboCustomerDto>>
{
    public int ProductId { get; set; }
}

public class GetCombosForProductQueryHandler
    : IRequestHandler<GetCombosForProductQuery, List<ProductComboCustomerDto>>
{
    private readonly IApplicationDbContext _context;

    public GetCombosForProductQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ProductComboCustomerDto>> Handle(
        GetCombosForProductQuery request, CancellationToken cancellationToken)
    {
        var combos = await _context.ProductCombos
            .Where(c => c.IsActive)
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.Category)
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.ProductVariants)
                        .ThenInclude(v => v.ProductVariantImages)
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.ProductVariants)
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.ProductCollections)
                        .ThenInclude(pc => pc.Collection)
            .Where(c => c.Items.Any(i => i.ProductId == request.ProductId))
            .ToListAsync(cancellationToken);

        var result = new List<ProductComboCustomerDto>();
        foreach (var combo in combos)
        {
            var isAvailable = (combo.MaxUses <= 0 || combo.CurrentUses < combo.MaxUses);
            var productsInStock = combo.Items.All(i =>
                i.Product.ProductVariants.Any(v => v.Quantity > 0));

            if (!isAvailable || !productsInStock)
            {
                var reason = !isAvailable ? "Combo đã hết lượt" : "Một số sản phẩm hết hàng";
                result.Add(new ProductComboCustomerDto
                {
                    Id = combo.Id,
                    Name = combo.Name,
                    Description = combo.Description,
                    Products = MapProducts(combo),
                    DiscountType = combo.DiscountType,
                    DiscountValue = combo.DiscountValue,
                    OriginalTotalPrice = CalculateOriginalTotal(combo),
                    ComboPrice = CalculateComboPrice(combo),
                    IsAvailable = false,
                    UnavailableReason = reason,
                });
            }
            else
            {
                result.Add(new ProductComboCustomerDto
                {
                    Id = combo.Id,
                    Name = combo.Name,
                    Description = combo.Description,
                    Products = MapProducts(combo),
                    DiscountType = combo.DiscountType,
                    DiscountValue = combo.DiscountValue,
                    OriginalTotalPrice = CalculateOriginalTotal(combo),
                    ComboPrice = CalculateComboPrice(combo),
                    IsAvailable = true,
                });
            }
        }

        return result.OrderByDescending(c => c.IsAvailable)
            .ThenByDescending(c => c.ComboPrice)
            .ToList();
    }

    private static List<ProductDto> MapProducts(Domain.Entities.ProductCombo combo)
    {
        return combo.Items.Select(i => new ProductDto
        {
            Id = i.Product.Id,
            Name = i.Product.Name ?? "",
            Slug = i.Product.Slug ?? "",
            MinPrice = i.Product.ProductVariants.Any()
                ? i.Product.ProductVariants.Min(v => v.Price) : 0m,
            MaxPrice = i.Product.ProductVariants.Any()
                ? i.Product.ProductVariants.Max(v => v.Price) : 0m,
            ThumbnailUrl = i.Product.ProductVariants
                .Where(v => v.IsDefault)
                .SelectMany(v => v.ProductVariantImages)
                .OrderByDescending(img => img.IsPrimary)
                .Select(img => img.ImageUrl)
                .FirstOrDefault()
                ?? i.Product.ProductVariants
                    .SelectMany(v => v.ProductVariantImages)
                    .OrderByDescending(img => img.IsPrimary)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
            IsInStock = i.Product.ProductVariants.Any(v => v.Quantity > 0),
            CategoryName = i.Product.Category?.Name ?? "Chưa phân loại",
            CategoryId = i.Product.CategoryId,
            CollectionNames = i.Product.ProductCollections.Select(pc => pc.Collection.Name).ToList(),
            CollectionIds = i.Product.ProductCollections.Select(pc => pc.CollectionId).ToList(),
        }).ToList();
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
