using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Atelier.Application.Carts.Commands;
using Atelier.Application.Carts.Queries;

namespace Atelier.Api.Controllers.Sales
{
    [Route("api/[controller]")]
    [ApiController]
    public class CartsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public CartsController(IMediator mediator)
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

        [HttpPost("items")]
        public async Task<ActionResult<int>> AddToCart([FromBody] AddToCartCommand command)
        {
            if (command.Quantity <= 0)
                return BadRequest("Số lượng phải lớn hơn 0.");

            command.UserId ??= GetUserId();

            var cartId = await _mediator.Send(command);
            return Ok(new { CartId = cartId, Message = "Đã thêm vào giỏ hàng thành công!" });
        }

        [HttpGet]
        public async Task<IActionResult> GetCart([FromQuery] int? userId, [FromQuery] string? sessionId)
        {
            var query = new GetCartQuery
            {
                UserId = userId ?? GetUserId(),
                SessionId = sessionId,
            };
            var result = await _mediator.Send(query);

            if (result == null)
                return NotFound("Giỏ hàng trống hoặc không tồn tại.");

            return Ok(result);
        }

        [HttpPut("items/{id}")]
        public async Task<IActionResult> UpdateItem(int id, [FromBody] UpdateCartItemCommand command)
        {
            command.CartItemId = id;
            try
            {
                await _mediator.Send(command);
                return Ok(new { message = "Đã cập nhật giỏ hàng." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [HttpDelete("items/{id}")]
        public async Task<IActionResult> RemoveItem(int id)
        {
            try
            {
                await _mediator.Send(new RemoveCartItemCommand { CartItemId = id });
                return Ok(new { message = "Đã xóa sản phẩm khỏi giỏ hàng." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("merge")]
        public async Task<IActionResult> MergeCart([FromBody] MergeCartRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            if ((request.Items == null || request.Items.Count == 0) && string.IsNullOrEmpty(request.SessionId))
                return Ok(new { message = "Không có sản phẩm nào để hợp nhất." });

            await _mediator.Send(new MergeCartCommand
            {
                UserId = userId,
                Items = request.Items ?? new(),
                SessionId = request.SessionId,
            });

            return Ok(new { message = "Đã hợp nhất giỏ hàng thành công!" });
        }

        [HttpPatch("combo")]
        public async Task<IActionResult> ApplyCombo([FromBody] ApplyComboRequest body)
        {
            await _mediator.Send(new ApplyComboToCartCommand
            {
                UserId = GetUserId(),
                SessionId = body.SessionId,
                ComboId = body.ComboId,
            });
            return Ok(new { message = "Đã áp dụng combo." });
        }

        [HttpDelete("combo")]
        public async Task<IActionResult> RemoveCombo([FromQuery] string? sessionId)
        {
            await _mediator.Send(new RemoveComboFromCartCommand
            {
                UserId = GetUserId(),
                SessionId = sessionId,
            });
            return Ok(new { message = "Đã bỏ combo." });
        }
    }
}

public class MergeCartRequest
{
    public List<CartItemInput> Items { get; set; } = new();
    public string? SessionId { get; set; }
}

public class ApplyComboRequest
{
    public int ComboId { get; set; }
    public string? SessionId { get; set; }
}
