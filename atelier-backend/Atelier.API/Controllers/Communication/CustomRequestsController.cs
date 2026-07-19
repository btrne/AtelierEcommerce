using Atelier.Application.CustomRequests.Commands;
using Atelier.Application.CustomRequests.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Communication;

[ApiController]
[Route("api/[controller]")]
public class CustomRequestsController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomRequestsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? status = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetAllCustomRequestsQuery { Status = status, Page = page, PageSize = pageSize });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCustomRequestCommand command)
    {
        try
        {
            await _mediator.Send(command);
            return Ok(new { message = "Yêu cầu chế tác của bạn đã được gửi." });
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
            await _mediator.Send(new DeleteCustomRequestCommand { Id = id });
            return Ok(new { message = "Đã xóa yêu cầu chế tác thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCustomRequestCommand command)
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

    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMy()
    {
        var userId = GetUserId();
        var result = await _mediator.Send(new GetMyCustomRequestsQuery { UserId = userId });
        return Ok(result);
    }

    [Authorize]
    [HttpGet("{id}/detail")]
    public async Task<IActionResult> GetDetail(int id)
    {
        var userId = GetUserId();
        var result = await _mediator.Send(new GetCustomRequestByIdQuery { Id = id, UserId = userId });
        if (result == null) return NotFound(new { Error = "Không tìm thấy yêu cầu chế tác." });
        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> Confirm(int id)
    {
        var userId = GetUserId();
        try
        {
            await _mediator.Send(new ConfirmCustomRequestCommand { Id = id, UserId = userId });
            return Ok(new { message = "Đã xác nhận yêu cầu chế tác." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(int id)
    {
        var userId = GetUserId();
        try
        {
            await _mediator.Send(new RejectCustomRequestCommand { Id = id, UserId = userId });
            return Ok(new { message = "Đã từ chối yêu cầu chế tác." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    private int GetUserId()
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (claim == null || !int.TryParse(claim.Value, out var userId))
            throw new UnauthorizedAccessException("Không thể xác thực người dùng.");
        return userId;
    }
}
