using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;


namespace Atelier.Application.Products.Queries;

public class ProductVariantOptionDto
{
    public int Id { get; set; }
    public string Sku { get; set; } = null!;
    public string ProductName { get; set; } = null!;
    public int Quantity { get; set; }
    public string? AttributeSummary { get; set; }
    public string? ThumbnailUrl { get; set; }
}

public class GetAllProductVariantsQuery : IRequest<List<ProductVariantOptionDto>> { }

public class GetAllProductVariantsQueryHandler : IRequestHandler<GetAllProductVariantsQuery, List<ProductVariantOptionDto>>
{
    private readonly IApplicationDbContext _context;
    public GetAllProductVariantsQueryHandler(IApplicationDbContext context) => _context = context;

    public async Task<List<ProductVariantOptionDto>> Handle(GetAllProductVariantsQuery request, CancellationToken ct)
    {
        return await _context.ProductVariants
            .Include(pv => pv.Product)
            .Where(pv => pv.Product!.IsActive)
            .OrderBy(pv => pv.Product!.Name)
            .Select(pv => new ProductVariantOptionDto
            {
                Id = pv.Id,
                Sku = pv.Sku ?? "",
                ProductName = pv.Product!.Name ?? "",
                Quantity = pv.Quantity,
                AttributeSummary = string.Join(", ", pv.VariantAttributes!
                    .Select(va => va.AttributeOption!.Value)),
                ThumbnailUrl = pv.ProductVariantImages!
                    .OrderBy(img => img.Id)
                    .Select(img => img.ImageUrl)
                    .FirstOrDefault(),
            })
            .ToListAsync(ct);
    }
}