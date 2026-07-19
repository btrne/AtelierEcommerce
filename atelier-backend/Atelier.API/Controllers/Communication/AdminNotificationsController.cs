using System.Text.Json;
using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Communication;

[ApiController]
[Route("api/admin/notifications")]
[Authorize(Roles = "Admin,Staff")]
public class AdminNotificationsController : ControllerBase
{
    private readonly INotificationService _notificationService;
    private readonly NotificationBroadcaster _broadcaster;

    public AdminNotificationsController(INotificationService notificationService, NotificationBroadcaster broadcaster)
    {
        _notificationService = notificationService;
        _broadcaster = broadcaster;
    }

    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent()
    {
        var notifications = await _notificationService.GetRecentNotificationsAsync();
        return Ok(notifications);
    }

    [HttpGet("stream")]
    public async Task GetStream(CancellationToken cancellationToken)
    {
        Response.Headers["Content-Type"] = "text/event-stream";
        Response.Headers["Cache-Control"] = "no-cache";
        Response.Headers["Connection"] = "keep-alive";

        var subscriberId = Guid.NewGuid().ToString();
        var reader = _broadcaster.Subscribe(subscriberId);

        try
        {
            await foreach (var notification in reader.ReadAllAsync(cancellationToken))
            {
                var json = JsonSerializer.Serialize(notification, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                await Response.WriteAsync($"data: {json}\n\n", cancellationToken);
                await Response.Body.FlushAsync(cancellationToken);
            }
        }
        finally
        {
            _broadcaster.Unsubscribe(subscriberId);
        }
    }
}
