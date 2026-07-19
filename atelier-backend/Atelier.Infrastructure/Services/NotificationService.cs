using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Infrastructure.Services;

public class NotificationService : INotificationService
{
    private readonly NotificationBroadcaster _broadcaster;
    private readonly IApplicationDbContext _context;

    public NotificationService(NotificationBroadcaster broadcaster, IApplicationDbContext context)
    {
        _broadcaster = broadcaster;
        _context = context;
    }

    public async Task SendNotificationAsync(NotificationDto notification)
    {
        await _broadcaster.BroadcastAsync(notification);
    }

    public async Task<List<NotificationDto>> GetRecentNotificationsAsync()
    {
        var results = new List<NotificationDto>();

        var conversations = await _context.Conversations
            .Where(c => c.Type == "Support" || c.Type == "Consulting")
            .Include(c => c.User)
            .Include(c => c.Messages)
            .OrderByDescending(c => c.StartedAt)
            .Take(10)
            .ToListAsync();

        foreach (var conv in conversations)
        {
            var hasAdminReply = conv.Messages.Any(m => m.Sender == "Admin");

            if (!hasAdminReply)
            {
                var lastMsg = conv.Messages.OrderByDescending(m => m.CreatedAt).FirstOrDefault();
                var preview = lastMsg?.MessageText ?? "";
                if (preview.Length > 100) preview = preview[..100] + "...";

                results.Add(new NotificationDto
                {
                    Id = $"conv-{conv.Id}",
                    Type = "NewConversation",
                    Title = conv.Type == "Support" ? "Yêu cầu hỗ trợ mới" : "Yêu cầu chế tác mới",
                    Body = $"{conv.User?.FullName ?? "Khách"}: {preview}",
                    ReferenceType = conv.Type == "Consulting" ? "ConsultingConversation" : "Conversation",
                    ReferenceId = conv.Id,
                    CreatedAt = conv.StartedAt,
                });
            }
            else
            {
                var customerMsgs = conv.Messages
                    .Where(m => m.Sender == "Customer")
                    .OrderByDescending(m => m.CreatedAt)
                    .Take(1);

                foreach (var msg in customerMsgs)
                {
                    var preview = msg.MessageText;
                    if (preview.Length > 100) preview = preview[..100] + "...";

                    results.Add(new NotificationDto
                    {
                        Id = $"msg-{msg.Id}",
                        Type = "NewMessage",
                        Title = "Tin nhắn mới từ khách",
                        Body = $"{conv.User?.FullName ?? "Khách"}: {preview}",
                        ReferenceType = conv.Type == "Consulting" ? "ConsultingConversation" : "Conversation",
                        ReferenceId = conv.Id,
                        CreatedAt = msg.CreatedAt,
                    });
                }
            }
        }

        var customRequests = await _context.CustomRequests
            .Where(cr => cr.Status == "Confirmed" || cr.Status == "Rejected"
                || cr.Status == "InProgress"
                || cr.Status == "Completed" || cr.Status == "Cancelled")
            .Include(cr => cr.User)
            .OrderByDescending(cr => cr.CreatedAt)
            .Take(10)
            .ToListAsync();

        foreach (var cr in customRequests)
        {
            var type = cr.Status switch
            {
                "Confirmed" => "CustomRequestConfirmed",
                "Rejected" => "CustomRequestRejected",
                "InProgress" => "CustomRequestInProgress",
                "Completed" => "CustomRequestCompleted",
                "Cancelled" => "CustomRequestCancelled",
                _ => "",
            };
            var title = cr.Status switch
            {
                "Confirmed" => "Khách xác nhận chế tác",
                "Rejected" => "Khách từ chối chế tác",
                "InProgress" => "Đang chế tác",
                "Completed" => "Đã hoàn thành",
                "Cancelled" => "Đã hủy",
                _ => "",
            };
            var body = cr.Status switch
            {
                "Confirmed" or "Rejected" => $"{cr.User?.FullName ?? "Khách"} đã {(cr.Status == "Confirmed" ? "xác nhận" : "từ chối")} yêu cầu #{cr.Id}",
                _ => $"Yêu cầu #{cr.Id}: {title.ToLower()}",
            };
            var timestamp = cr.Status switch
            {
                "Confirmed" => cr.CustomerConfirmedAt ?? cr.CreatedAt,
                "InProgress" => cr.StartedAt ?? cr.CreatedAt,
                "Completed" => cr.FinishedAt ?? cr.CreatedAt,
                "Cancelled" => cr.CancelledAt ?? cr.CreatedAt,
                _ => cr.CreatedAt,
            };

            results.Add(new NotificationDto
            {
                Id = $"cr-{cr.Id}-{cr.Status}",
                Type = type,
                Title = title,
                Body = body,
                ReferenceType = "CustomRequest",
                ReferenceId = cr.Id,
                CreatedAt = timestamp,
            });
        }

        return results.OrderByDescending(n => n.CreatedAt).Take(20).ToList();
    }
}
