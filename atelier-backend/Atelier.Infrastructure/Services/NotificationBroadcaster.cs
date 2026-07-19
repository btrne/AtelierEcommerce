using System.Collections.Concurrent;
using System.Threading.Channels;
using Atelier.Application.DTOs;

namespace Atelier.Infrastructure.Services;

public class NotificationBroadcaster
{
    private readonly ConcurrentDictionary<string, Channel<NotificationDto>> _subscribers = new();

    public ChannelReader<NotificationDto> Subscribe(string subscriberId)
    {
        var channel = Channel.CreateBounded<NotificationDto>(new BoundedChannelOptions(100)
        {
            FullMode = BoundedChannelFullMode.DropOldest
        });
        _subscribers.TryAdd(subscriberId, channel);
        return channel.Reader;
    }

    public void Unsubscribe(string subscriberId)
    {
        if (_subscribers.TryRemove(subscriberId, out var channel))
        {
            channel.Writer.TryComplete();
        }
    }

    public Task BroadcastAsync(NotificationDto notification)
    {
        foreach (var (_, channel) in _subscribers)
        {
            channel.Writer.TryWrite(notification);
        }
        return Task.CompletedTask;
    }
}
