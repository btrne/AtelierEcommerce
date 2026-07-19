using Atelier.Application.Users.Commands;
using Atelier.Application.Users.Queries;
using Atelier.Application.DTOs;
using Atelier.Application.Roles.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Auth;

[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = "Admin")]
public class AdminUsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminUsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search = null, [FromQuery] bool? isActive = null, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetAllUsersQuery { Search = search, IsActive = isActive, Page = page, PageSize = pageSize });
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _mediator.Send(new DeleteUserCommand { Id = id });
            return Ok(new { message = "Đã xóa người dùng thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpPut("{id}/toggle-active")]
    public async Task<IActionResult> ToggleActive(int id)
    {
        try
        {
            var isActive = await _mediator.Send(new ToggleUserActiveCommand { Id = id });
            return Ok(new { isActive, message = isActive ? "Đã kích hoạt người dùng." : "Đã vô hiệu hóa người dùng." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserCommand command)
    {
        try
        {
            var user = await _mediator.Send(command);
            return Ok(user);
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpPost("{userId}/roles/{roleId}")]
    public async Task<IActionResult> AssignRole(int userId, int roleId)
    {
        try
        {
            await _mediator.Send(new AssignRoleCommand { UserId = userId, RoleId = roleId });
            return Ok(new { message = "Đã gán quyền thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }

    [HttpDelete("{userId}/roles/{roleId}")]
    public async Task<IActionResult> RemoveRole(int userId, int roleId)
    {
        try
        {
            await _mediator.Send(new RemoveRoleCommand { UserId = userId, RoleId = roleId });
            return Ok(new { message = "Đã xóa quyền thành công." });
        }
        catch (Exception ex)
        {
            return BadRequest(new { Error = ex.Message });
        }
    }
}
