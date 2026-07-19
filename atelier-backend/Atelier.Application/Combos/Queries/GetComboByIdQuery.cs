using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Combos.Queries;

public class GetComboByIdQuery : IRequest<ProductComboAdminDto?>
{
    public int Id { get; set; }
}

public class GetComboByIdQueryHandler
    : IRequestHandler<GetComboByIdQuery, ProductComboAdminDto?>
{
    private readonly IApplicationDbContext _context;

    public GetComboByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProductComboAdminDto?> Handle(
        GetComboByIdQuery request, CancellationToken cancellationToken)
    {
        var combo = await _context.ProductCombos
            .Include(c => c.Items)
                .ThenInclude(i => i.Product)
                    .ThenInclude(p => p.ProductVariants)
                        .ThenInclude(v => v.ProductVariantImages)
            .FirstOrDefaultAsync(c => c.Id == request.Id, cancellationToken);

        if (combo == null) return null;

        return GetAllCombosQueryHandler.MapToAdminDto(combo);
    }
}
