using Atelier.Application.DTOs;

namespace Atelier.Application.Common.Interfaces;

public interface INotificationService
{
    Task SendNotificationAsync(NotificationDto notification);
    Task<List<NotificationDto>> GetRecentNotificationsAsync();
}
