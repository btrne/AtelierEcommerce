using Atelier.Application.Attributes.Commands;
using Atelier.Application.Attributes.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Products;

[ApiController]
[Route("api/[controller]")]
public class AttributesController : ControllerBase
{
    private readonly IMediator _mediator;

    public AttributesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _mediator.Send(new GetAllAttributesQuery());
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetAttributeByIdQuery(id));
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy thuộc tính với ID = {id}" });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAttributeCommand command)
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
    public async Task<IActionResult> Update(int id, [FromBody] UpdateAttributeCommand command)
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
            await _mediator.Send(new DeleteAttributeCommand(id));
            return Ok(new { message = "Đã xóa thuộc tính thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{attributeId}/options")]
    public async Task<IActionResult> CreateOption(int attributeId, [FromBody] CreateAttributeOptionCommand command)
    {
        command.AttributeId = attributeId;
        try
        {
            var result = await _mediator.Send(command);
            return CreatedAtAction(nameof(GetById), new { id = attributeId }, result);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPut("options/{id}")]
    public async Task<IActionResult> UpdateOption(int id, [FromBody] UpdateAttributeOptionCommand command)
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
    [HttpDelete("options/{id}")]
    public async Task<IActionResult> DeleteOption(int id)
    {
        try
        {
            await _mediator.Send(new DeleteAttributeOptionCommand(id));
            return Ok(new { message = "Đã xóa giá trị thuộc tính thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}
