using System.Security.Claims;
using Atelier.Application.Conversations.Commands;
using Atelier.Application.Conversations.Queries;
using Atelier.Application.CustomRequests.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Communication;

[ApiController]
[Route("api/[controller]")]
public class ConversationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ConversationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20, [FromQuery] string? type = null, [FromQuery] string? search = null, [FromQuery] bool? hasCustomRequests = null)
    {
        var result = await _mediator.Send(new GetAllConversationsQuery { Page = page, PageSize = pageSize, Type = type, Search = search, HasCustomRequests = hasCustomRequests });
        return Ok(result);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateConversationCommand command)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { Error = "Vui lòng đăng nhập." });
        command.UserId = userId;

        try
        {
            var conversationId = await _mediator.Send(command);
            return Ok(new { conversationId, message = "Tin nhắn đã được gửi." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize]
    [HttpGet("my")]
    public async Task<IActionResult> GetMyConversations([FromQuery] string? type = null)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();
        var result = await _mediator.Send(new GetMyConversationsQuery { UserId = userId, Type = type });
        return Ok(result);
    }

    [HttpGet("{id}/messages")]
    public async Task<IActionResult> GetMessages(int id)
    {
        var result = await _mediator.Send(new GetMessagesQuery { ConversationId = id });
        return Ok(result);
    }

    [Authorize]
    [HttpPost("{id}/messages")]
    public async Task<IActionResult> SendMessage(int id, [FromBody] SendMessageCommand command)
    {
        command.ConversationId = id;
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && int.TryParse(userIdClaim, out _))
        {
            var isAdmin = User.IsInRole("Admin") || User.IsInRole("Staff");
            command.Sender = isAdmin ? "Admin" : "Customer";
        }
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
    [HttpPost("{id}/create-request")]
    public async Task<IActionResult> CreateCustomRequest(int id, [FromBody] CreateCustomRequestFromConversationCommand command)
    {
        command.ConversationId = id;
        try
        {
            await _mediator.Send(command);
            return Ok(new { message = "Đã tạo yêu cầu chế tác." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}
