using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Tracking.Commands;

public class LogEventCommand : IRequest
{
    public int? UserId { get; set; }
    public string? SessionId { get; set; }
    public string EventType { get; set; } = null!;
    public string? EntityType { get; set; }
    public int? EntityId { get; set; }
    public string? Data { get; set; }
}

public class LogEventCommandHandler : IRequestHandler<LogEventCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public LogEventCommandHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task Handle(LogEventCommand request, CancellationToken cancellationToken)
    {
        if (request.EventType == "view_product" && request.EntityId.HasValue && !string.IsNullOrEmpty(request.SessionId))
        {
            var recent = await _context.UserEvents
                .AnyAsync(e => e.EventType == "view_product"
                    && e.EntityId == request.EntityId
                    && e.SessionId == request.SessionId
                    && e.CreatedAt >= _dateTime.UtcNow.AddMinutes(-5), cancellationToken);
            if (recent) return;
        }

        var userEvent = new UserEvent
        {
            UserId = request.UserId,
            SessionId = request.SessionId,
            EventType = request.EventType,
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            Data = request.Data,
            CreatedAt = _dateTime.UtcNow,
        };

        _context.UserEvents.Add(userEvent);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
