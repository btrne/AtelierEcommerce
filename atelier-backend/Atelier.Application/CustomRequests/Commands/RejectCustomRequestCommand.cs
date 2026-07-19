using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.CustomRequests.Commands;

public class RejectCustomRequestCommand : IRequest
{
    public int Id { get; set; }
    public int UserId { get; set; }
}

public class RejectCustomRequestCommandHandler : IRequestHandler<RejectCustomRequestCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public RejectCustomRequestCommandHandler(IApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task Handle(RejectCustomRequestCommand request, CancellationToken cancellationToken)
    {
        var cr = await _context.CustomRequests
            .Include(cr => cr.User)
            .FirstOrDefaultAsync(cr => cr.Id == request.Id && cr.UserId == request.UserId, cancellationToken)
            ?? throw new Exception("Không tìm thấy yêu cầu chế tác.");

        if (cr.Status != "Quoted")
            throw new Exception("Chỉ có thể từ chối khi đã có báo giá.");

        cr.Status = "Rejected";

        await _context.SaveChangesAsync(cancellationToken);

        await _notificationService.SendNotificationAsync(new NotificationDto
        {
            Id = $"cr-{cr.Id}",
            Type = "CustomRequestRejected",
            Title = "Khách từ chối chế tác",
            Body = $"{cr.User?.FullName ?? "Khách"} đã từ chối yêu cầu #{cr.Id}",
            ReferenceType = "CustomRequest",
            ReferenceId = cr.Id,
            CreatedAt = DateTime.UtcNow,
        });
    }
}
