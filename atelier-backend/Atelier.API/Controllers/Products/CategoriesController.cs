using Atelier.Application.Categories.Commands;
using Atelier.Application.Categories.Queries;
using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Api.Controllers.Products;

[ApiController]
[Route("api/[controller]")]
public class CategoriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public CategoriesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool includeInactive = false)
    {
        var query = new GetAllCategoriesQuery { IncludeInactive = includeInactive };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetCategoryByIdQuery(id));
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy danh mục với ID = {id}" });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCategoryCommand command)
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
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCategoryCommand command)
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
            await _mediator.Send(new DeleteCategoryCommand(id));
            return Ok(new { message = "Đã xóa danh mục thành công." });
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
        var products = await context.Products
            .Where(p => p.CategoryId == id)
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
    [HttpPost("{id}/products")]
    public async Task<IActionResult> CreateProduct(int id, [FromBody] CreateProductForCategoryDto dto, [FromServices] IApplicationDbContext context)
    {
        var category = await context.Categories.FindAsync(id);
        if (category == null)
            return NotFound(new { Error = "Không tìm thấy danh mục." });

        var product = new Atelier.Domain.Entities.Product
        {
            CategoryId = id,
            Name = dto.Name,
            Slug = dto.Slug,
            ShortDescription = dto.ShortDescription,
            Description = dto.Description,
            IsFeatured = dto.IsFeatured,
            IsPreorder = dto.IsPreorder,
            IsActive = dto.IsActive,
            CreatedAt = DateTime.UtcNow,
        };
        context.Products.Add(product);
        await context.SaveChangesAsync(CancellationToken.None);

        return Ok(new { message = "Đã tạo sản phẩm thành công.", id = product.Id });
    }
}

public class CreateProductForCategoryDto
{
    public string Name { get; set; } = null!;
    public string? Slug { get; set; }
    public string? ShortDescription { get; set; }
    public string? Description { get; set; }
    public bool IsFeatured { get; set; }
    public bool IsPreorder { get; set; }
    public bool IsActive { get; set; } = true;
}
