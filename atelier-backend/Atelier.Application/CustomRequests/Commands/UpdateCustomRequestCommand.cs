using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.CustomRequests.Commands;

public class UpdateCustomRequestCommand : IRequest<CustomRequestAdminDto>
{
    public int Id { get; set; }
    public decimal? QuotedPrice { get; set; }
    public DateTime? EstimatedFinishDate { get; set; }
    public string? Status { get; set; }
}

public class UpdateCustomRequestCommandHandler : IRequestHandler<UpdateCustomRequestCommand, CustomRequestAdminDto>
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public UpdateCustomRequestCommandHandler(IApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<CustomRequestAdminDto> Handle(UpdateCustomRequestCommand request, CancellationToken cancellationToken)
    {
        var customRequest = await _context.CustomRequests
            .Include(cr => cr.User)
            .FirstOrDefaultAsync(cr => cr.Id == request.Id, cancellationToken);

        if (customRequest == null)
            throw new Exception($"Không tìm thấy yêu cầu chế tác với ID = {request.Id}");

        if (request.QuotedPrice.HasValue)
            customRequest.QuotedPrice = request.QuotedPrice.Value;

        if (request.EstimatedFinishDate.HasValue)
            customRequest.EstimatedFinishDate = request.EstimatedFinishDate.Value;

        string? statusChangedTo = null;

        if (request.Status != null && request.Status != customRequest.Status)
        {
            var now = DateTime.UtcNow;
            customRequest.Status = request.Status;
            statusChangedTo = request.Status;
            switch (request.Status)
            {
                case "Confirmed":
                    customRequest.CustomerConfirmedAt ??= now;
                    break;
                case "InProgress":
                    customRequest.StartedAt ??= now;
                    break;
                case "Completed":
                    customRequest.FinishedAt ??= now;
                    break;
                case "Cancelled":
                    customRequest.CancelledAt ??= now;
                    break;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (statusChangedTo != null)
        {
            var statusLabels = new Dictionary<string, string>
            {
                ["InProgress"] = "đang chế tác",
                ["Completed"] = "đã hoàn thành",
                ["Cancelled"] = "đã hủy",
            };

            if (statusLabels.TryGetValue(statusChangedTo, out var label))
            {
                await _notificationService.SendNotificationAsync(new NotificationDto
                {
                    Id = $"cr-status-{customRequest.Id}-{statusChangedTo}",
                    Type = $"CustomRequest{statusChangedTo}",
                    Title = $"Yêu cầu #{customRequest.Id} {label}",
                    Body = $"{customRequest.User?.FullName ?? "Khách"}: yêu cầu #{customRequest.Id} {label}",
                    ReferenceType = "CustomRequest",
                    ReferenceId = customRequest.Id,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        return new CustomRequestAdminDto
            {
                Id = customRequest.Id,
                UserId = customRequest.UserId,
                UserName = customRequest.User?.FullName ?? customRequest.User?.Email,
                Description = customRequest.Description,
                QuotedPrice = customRequest.QuotedPrice,
                EstimatedFinishDate = customRequest.EstimatedFinishDate,
                Status = customRequest.Status ?? "",
                ConversationId = customRequest.ConversationId,
                CustomerConfirmedAt = customRequest.CustomerConfirmedAt,
                StartedAt = customRequest.StartedAt,
                FinishedAt = customRequest.FinishedAt,
                CancelledAt = customRequest.CancelledAt,
                CreatedAt = customRequest.CreatedAt,
            };
    }
}
