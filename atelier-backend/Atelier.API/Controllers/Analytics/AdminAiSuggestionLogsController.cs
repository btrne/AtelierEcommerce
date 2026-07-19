using Atelier.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Api.Controllers.Analytics;

[ApiController]
[Route("api/admin/ai-suggestion-logs")]
[Authorize(Roles = "Admin")]
public class AdminAiSuggestionLogsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public AdminAiSuggestionLogsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var query = _context.AiSuggestionLogs
            .OrderByDescending(x => x.SuggestedAt);

        var totalCount = await query.CountAsync();
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new
            {
                x.Id,
                x.UserId,
                x.UserQuery,
                x.AiMessage,
                x.ProductId,
                x.ProductName,
                x.ProductPrice,
                x.ProductImage,
                x.ProductSlug,
                x.CategoryName,
                x.SuggestedAt
            })
            .ToListAsync();

        return Ok(new
        {
            items,
            totalCount,
            page,
            pageSize,
            totalPages = (int)Math.Ceiling(totalCount / (double)pageSize)
        });
    }
}
