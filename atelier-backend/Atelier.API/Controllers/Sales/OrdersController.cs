using System.Security.Claims;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Atelier.Application.Orders.Commands;
using Atelier.Application.Orders.Queries;

namespace Atelier.Api.Controllers.Sales
{
    [Route("api/[controller]")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly IMediator _mediator;

        public OrdersController(IMediator mediator)
        {
            _mediator = mediator;
        }

        private int? GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out var userId) ? userId : null;
        }

        private bool CanAccessAllOrders() =>
            User.IsInRole("Admin") || User.IsInRole("Staff");

        [Authorize]
        [HttpGet("my-orders")]
        public async Task<IActionResult> GetMyOrders([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? status = null)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var query = new GetMyOrdersQuery { UserId = userId, Page = page, PageSize = pageSize, Status = status };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [HttpPost("checkout")]
        public async Task<IActionResult> Checkout([FromBody] CheckoutCommand command)
        {
            try
            {
                command.UserId = GetUserId();
                var result = await _mediator.Send(command);
                return Ok(new { result.OrderId, result.PaymentUrl, Message = "Đặt hàng thành công!" });
            }
            catch (Exception ex)
            {
                var inner = ex.InnerException?.Message ?? "";
                Console.Error.WriteLine($"Checkout error: {ex.Message} | Inner: {inner}");
                return BadRequest(new { Error = ex.Message, InnerError = inner });
            }
        }

        [Authorize]
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserOrders(int userId)
        {
            if (!CanAccessAllOrders() && GetUserId() != userId)
                return Forbid();

            var query = new GetUserOrdersQuery { UserId = userId };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [Authorize]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _mediator.Send(new GetOrderByIdQuery
            {
                Id = id,
                UserId = CanAccessAllOrders() ? null : GetUserId(),
            });
            if (result == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });
            return Ok(result);
        }

        [Authorize]
        [HttpPost("{id}/cancel")]
        public async Task<IActionResult> Cancel(int id)
        {
            try
            {
                var userId = GetUserId();
                if (userId == null)
                    return Unauthorized();

                await _mediator.Send(new CancelOrderCommand
                {
                    Id = id,
                    UserId = userId.Value,
                    IsAdmin = CanAccessAllOrders(),
                });
                return Ok(new { message = "Đã hủy đơn hàng thành công." });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }

        [Authorize(Roles = "Admin")]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? status = null, [FromQuery] string? search = null, [FromQuery] DateTime? dateFrom = null, [FromQuery] DateTime? dateTo = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var query = new GetAllOrdersQuery { Status = status, Search = search, DateFrom = dateFrom, DateTo = dateTo, Page = page, PageSize = pageSize };
            var result = await _mediator.Send(query);
            return Ok(result);
        }

        [Authorize(Roles = "Admin")]
        [HttpGet("detail/{id}")]
        public async Task<IActionResult> GetDetail(int id)
        {
            var result = await _mediator.Send(new GetOrderDetailQuery(id));
            if (result == null)
                return NotFound(new { message = "Không tìm thấy đơn hàng." });
            return Ok(result);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateOrderStatusCommand command)
        {
            command.Id = id;
            try
            {
                await _mediator.Send(command);
                return Ok(new { message = "Đã cập nhật trạng thái đơn hàng." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = ex.Message });
            }
        }
    }
}
