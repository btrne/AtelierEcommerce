using Atelier.Application.InventoryTransactions.Commands;
using Atelier.Application.InventoryTransactions.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Analytics;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class InventoryTransactionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public InventoryTransactionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? productVariantId = null, [FromQuery] string? transactionType = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetAllInventoryTransactionsQuery
        {
            ProductVariantId = productVariantId,
            TransactionType = transactionType,
            Page = page,
            PageSize = pageSize,
        });
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInventoryTransactionCommand command)
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
}
