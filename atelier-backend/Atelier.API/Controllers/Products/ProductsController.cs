using Atelier.Application.Products.Commands;
using Atelier.Application.Products.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Products;

[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ProductsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] bool? isFeatured = null,
        [FromQuery] bool? isActive = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? categoryIds = null,
        [FromQuery] int? collectionId = null,
        [FromQuery] string? collectionIds = null,
        [FromQuery] string? search = null,
        [FromQuery] decimal? minPrice = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] decimal? minRating = null,
        [FromQuery] bool? isPreorder = null,
        [FromQuery] bool? inStock = null,
        [FromQuery] string? attributeOptionIds = null,
        [FromQuery] string? sortBy = null,
        [FromQuery] int? page = null,
        [FromQuery] int? pageSize = null)
    {
        var query = new GetAllProductsQuery
        {
            IsFeatured = isFeatured,
            IsActive = isActive,
            CategoryId = categoryId,
            CategoryIds = categoryIds?.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList(),
            CollectionId = collectionId,
            CollectionIds = collectionIds?.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList(),
            Search = search,
            MinPrice = minPrice,
            MaxPrice = maxPrice,
            MinRating = minRating,
            IsPreorder = isPreorder,
            InStock = inStock,
            AttributeOptionIds = attributeOptionIds?.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList(),
            SortBy = sortBy,
            Page = page,
            PageSize = pageSize,
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("variants")]
    public async Task<IActionResult> GetAllVariants()
    {
        var result = await _mediator.Send(new GetAllProductVariantsQuery());
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAllAdmin([FromQuery] bool? isActive = null, [FromQuery] bool? isFeatured = null, [FromQuery] int? categoryId = null, [FromQuery] string? search = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = new GetAllProductsAdminQuery
        {
            IsActive = isActive,
            IsFeatured = isFeatured,
            CategoryId = categoryId,
            Search = search,
            Page = page,
            PageSize = pageSize,
        };
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetProductByIdQuery(id));
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy sản phẩm với ID = {id}" });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin/{id}")]
    public async Task<IActionResult> GetAdminById(int id)
    {
        var result = await _mediator.Send(new GetProductAdminByIdQuery(id));
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy sản phẩm với ID = {id}" });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProductCommand command)
    {
        try
        {
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetAdminById), new { id = result.Id }, result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductCommand command)
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
            await _mediator.Send(new DeleteProductCommand(id));
            return Ok(new { message = "Đã xóa sản phẩm thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{productId}/variants")]
    public async Task<IActionResult> CreateVariant(int productId, [FromBody] CreateProductVariantCommand command)
    {
        command.ProductId = productId;
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
    [HttpPut("variants/{id}")]
    public async Task<IActionResult> UpdateVariant(int id, [FromBody] UpdateProductVariantCommand command)
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
    [HttpDelete("variants/{id}")]
    public async Task<IActionResult> DeleteVariant(int id)
    {
        try
        {
            await _mediator.Send(new DeleteProductVariantCommand(id));
            return Ok(new { message = "Đã xóa biến thể thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("variants/{variantId}/images")]
    public async Task<IActionResult> AddImage(int variantId, [FromBody] AddVariantImageCommand command)
    {
        command.ProductVariantId = variantId;
        try
        {
            await _mediator.Send(command);
            return Ok(new { message = "Đã thêm hình ảnh thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpDelete("images/{imageId}")]
    public async Task<IActionResult> DeleteImage(int imageId)
    {
        try
        {
            await _mediator.Send(new DeleteVariantImageCommand(imageId));
            return Ok(new { message = "Đã xóa hình ảnh thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("images/{imageId}/primary")]
    public async Task<IActionResult> SetPrimaryImage(int imageId, [FromBody] SetPrimaryImageCommand command)
    {
        command.Id = imageId;
        try
        {
            await _mediator.Send(command);
            return Ok(new { message = "Đã đặt ảnh chính thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}
