using Atelier.Application.Vouchers.Commands;
using Atelier.Application.Vouchers.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Sales;

[ApiController]
[Route("api/[controller]")]
public class VouchersController : ControllerBase
{
    private readonly IMediator _mediator;

    public VouchersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [Authorize(Roles = "Admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool? isActive = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetAllVouchersQuery { IsActive = isActive, Page = page, PageSize = pageSize });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var result = await _mediator.Send(new GetVoucherByIdQuery(id));
        if (result == null)
            return NotFound(new { message = $"Không tìm thấy voucher với ID = {id}" });
        return Ok(result);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVoucherCommand command)
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
    public async Task<IActionResult> Update(int id, [FromBody] UpdateVoucherCommand command)
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
            await _mediator.Send(new DeleteVoucherCommand(id));
            return Ok(new { message = "Đã xóa voucher thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpPost("apply")]
    public async Task<IActionResult> Apply([FromBody] ApplyVoucherQuery query)
    {
        var result = await _mediator.Send(query);
        if (result == null)
            return NotFound(new { valid = false, message = "Mã voucher không hợp lệ hoặc đã hết hạn." });
        return Ok(result);
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive()
    {
        var result = await _mediator.Send(new GetActiveVouchersQuery());
        return Ok(result);
    }
}
