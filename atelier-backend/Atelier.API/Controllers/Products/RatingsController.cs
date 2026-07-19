using System.Security.Claims;
using Atelier.Application.Ratings.Commands;
using Atelier.Application.Ratings.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Products;

[ApiController]
[Route("api/[controller]")]
public class RatingsController : ControllerBase
{
    private readonly IMediator _mediator;

    public RatingsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    private int? GetUserId()
    {
        var claim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (claim != null && int.TryParse(claim, out var userId))
            return userId;
        return null;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetAllRatingsQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }

    [HttpGet("product/{productId}")]
    public async Task<IActionResult> GetProductRatings(int productId)
    {
        var result = await _mediator.Send(new GetProductRatingsQuery { ProductId = productId });
        return Ok(result);
    }

    [Authorize]
    [HttpGet("product/{productId}/can-review")]
    public async Task<IActionResult> CanReview(int productId)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();
        var result = await _mediator.Send(new GetCanReviewProductQuery { ProductId = productId, UserId = userId.Value });
        return Ok(new { canReview = result });
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRatingCommand command)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();
        command.UserId = userId.Value;
        try
        {
            await _mediator.Send(command);
            return Ok(new { message = "Đã gửi đánh giá thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("product")]
    public async Task<IActionResult> CreateProductRating([FromBody] CreateProductRatingCommand command)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();
        command.UserId = userId.Value;
        try
        {
            await _mediator.Send(command);
            return Ok(new { message = "Đã gửi đánh giá thành công." });
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
            await _mediator.Send(new DeleteRatingCommand(id));
            return Ok(new { message = "Đã xóa đánh giá." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}
