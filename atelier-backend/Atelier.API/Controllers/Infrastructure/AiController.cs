using System.Security.Claims;
using Atelier.Application.Ai.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Infrastructure;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IMediator _mediator;

    public AiController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AiChatQuery query)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim != null && int.TryParse(userIdClaim, out var userId))
        {
            query.UserId = userId;
        }

        try
        {
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}
