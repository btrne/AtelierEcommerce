using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.CustomRequests.Commands;

public class ConfirmCustomRequestCommand : IRequest
{
    public int Id { get; set; }
    public int UserId { get; set; }
}

public class ConfirmCustomRequestCommandHandler : IRequestHandler<ConfirmCustomRequestCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public ConfirmCustomRequestCommandHandler(IApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task Handle(ConfirmCustomRequestCommand request, CancellationToken cancellationToken)
    {
        var cr = await _context.CustomRequests
            .Include(cr => cr.User)
            .FirstOrDefaultAsync(cr => cr.Id == request.Id && cr.UserId == request.UserId, cancellationToken)
            ?? throw new Exception("Không tìm thấy yêu cầu chế tác.");

        if (cr.Status != "Quoted")
            throw new Exception("Chỉ có thể xác nhận khi đã có báo giá.");

        cr.Status = "Confirmed";
        cr.CustomerConfirmedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(cancellationToken);

        await _notificationService.SendNotificationAsync(new NotificationDto
        {
            Id = $"cr-{cr.Id}",
            Type = "CustomRequestConfirmed",
            Title = "Khách xác nhận chế tác",
            Body = $"{cr.User?.FullName ?? "Khách"} đã xác nhận yêu cầu #{cr.Id}",
            ReferenceType = "CustomRequest",
            ReferenceId = cr.Id,
            CreatedAt = DateTime.UtcNow,
        });
    }
}
