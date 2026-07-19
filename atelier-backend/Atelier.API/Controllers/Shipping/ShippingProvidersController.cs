using Atelier.Application.Shipping.Commands;
using Atelier.Application.Shipping.Queries;
using Atelier.Application.ShippingProviders.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Shipping;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class ShippingProvidersController : ControllerBase
{
    private readonly IMediator _mediator;

    public ShippingProvidersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? includeInactive = null)
    {
        var result = await _mediator.Send(new GetShippingProvidersQuery
        {
            IncludeInactive = includeInactive ?? true,
        });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateShippingProviderCommand command)
    {
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

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateShippingProviderCommand command)
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

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _mediator.Send(new DeleteShippingProviderCommand(id));
            return Ok(new { message = "Đã xóa đơn vị vận chuyển thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}