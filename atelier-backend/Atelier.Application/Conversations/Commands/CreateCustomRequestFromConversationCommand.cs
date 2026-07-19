using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Conversations.Commands;

public class CreateCustomRequestFromConversationCommand : IRequest
{
    public int ConversationId { get; set; }
    public string Description { get; set; } = null!;
    public decimal? QuotedPrice { get; set; }
    public DateTime? EstimatedFinishDate { get; set; }
    public string? ImageUrl { get; set; }
}

public class CreateCustomRequestFromConversationCommandHandler : IRequestHandler<CreateCustomRequestFromConversationCommand>
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public CreateCustomRequestFromConversationCommandHandler(
        IApplicationDbContext context,
        INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task Handle(CreateCustomRequestFromConversationCommand request, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == request.ConversationId, cancellationToken)
            ?? throw new Exception("Không tìm thấy hội thoại.");

        var customRequest = new CustomRequest
        {
            UserId = conversation.UserId,
            Description = request.Description,
            QuotedPrice = request.QuotedPrice,
            EstimatedFinishDate = request.EstimatedFinishDate,
            ImageUrl = request.ImageUrl,
            Status = "Quoted",
            ConversationId = request.ConversationId,
            CreatedAt = DateTime.UtcNow,
        };

        _context.CustomRequests.Add(customRequest);
        await _context.SaveChangesAsync(cancellationToken);

        await _notificationService.SendNotificationAsync(new NotificationDto
        {
            Id = $"cr-quoted-{customRequest.Id}",
            Type = "CustomRequestQuoted",
            Title = "Yêu cầu chế tác đã có báo giá",
            Body = $"Yêu cầu #{customRequest.Id} đã có báo giá {customRequest.QuotedPrice:N0}₫. Vui lòng xác nhận.",
            ReferenceType = "CustomRequest",
            ReferenceId = customRequest.Id,
            CreatedAt = DateTime.UtcNow,
        });
    }
}
