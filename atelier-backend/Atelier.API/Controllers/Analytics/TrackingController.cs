using Atelier.Application.Tracking.Commands;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Analytics;

[ApiController]
[Route("api/[controller]")]
public class TrackingController : ControllerBase
{
    private readonly IMediator _mediator;

    public TrackingController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("event")]
    public async Task<IActionResult> LogEvent([FromBody] LogEventCommand command)
    {
        if (User.Identity?.IsAuthenticated == true)
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (int.TryParse(userIdClaim, out var userId))
                command.UserId = userId;
        }

        await _mediator.Send(command);
        return Ok();
    }
}
