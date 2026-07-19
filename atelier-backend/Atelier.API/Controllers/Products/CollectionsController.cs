using Atelier.Application.Collections.Commands;
using Atelier.Application.Collections.Queries;
using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Api.Controllers.Products;

[ApiController]
[Route("api/[controller]")]
public class CollectionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public CollectionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = new GetAllCollectionsQuery { IncludeInactive = includeInactive };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("best-sellers")]
    public async Task<IActionResult> GetBestSellers([FromQuery] int count = 3)
    {
        var query = new GetBestSellingCollectionsQuery { Count = count };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetCollectionByIdQuery(id));
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy bộ sưu tập với ID = {id}" });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCollectionCommand command)
    {
        try
        {
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCollectionCommand command)
    {
        command.Id = id;
        try
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _mediator.Send(new DeleteCollectionCommand(id));
            return Ok(new { message = "Đã xóa bộ sưu tập thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("{id}/products")]
    public async Task<IActionResult> GetProducts(int id, [FromServices] IApplicationDbContext context)
    {
        var productIds = await context.ProductCollections
            .Where(pc => pc.CollectionId == id)
            .Select(pc => pc.ProductId)
            .ToListAsync();

        var products = await context.Products
            .Where(p => productIds.Contains(p.Id))
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .ToListAsync();

        var result = products.Select(p => new ProductAdminDto
        {
            Id = p.Id,
            Name = p.Name,
            Slug = p.Slug,
            ShortDescription = p.ShortDescription,
            CategoryName = p.Category?.Name ?? "",
            CategoryId = p.CategoryId,
            MinPrice = p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : 0,
            TotalStock = p.ProductVariants.Sum(v => v.Quantity),
            VariantCount = p.ProductVariants.Count,
            ThumbnailUrl = p.ProductVariants.SelectMany(v => v.ProductVariantImages).FirstOrDefault()?.ImageUrl,
            IsFeatured = p.IsFeatured,
            IsPreorder = p.IsPreorder,
            IsActive = p.IsActive,
            CreatedAt = p.CreatedAt,
        }).ToList();

        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id}/products/{productId}")]
    public async Task<IActionResult> AddProduct(int id, int productId, [FromServices] IApplicationDbContext context)
    {
        var exists = await context.ProductCollections
            .AnyAsync(pc => pc.CollectionId == id && pc.ProductId == productId);
        if (exists)
            return BadRequest(new { Error = "Sản phẩm đã có trong bộ sưu tập." });

        context.ProductCollections.Add(new Atelier.Domain.Entities.ProductCollection
        {
            CollectionId = id,
            ProductId = productId,
        });
        await context.SaveChangesAsync(CancellationToken.None);
        return Ok(new { message = "Đã thêm sản phẩm vào bộ sưu tập." });
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}/products/{productId}")]
    public async Task<IActionResult> RemoveProduct(int id, int productId, [FromServices] IApplicationDbContext context)
    {
        var pc = await context.ProductCollections
            .FirstOrDefaultAsync(pc => pc.CollectionId == id && pc.ProductId == productId);
        if (pc == null)
            return NotFound(new { Error = "Sản phẩm không có trong bộ sưu tập." });

        context.ProductCollections.Remove(pc);
        await context.SaveChangesAsync(CancellationToken.None);
        return Ok(new { message = "Đã xóa sản phẩm khỏi bộ sưu tập." });
    }
}
