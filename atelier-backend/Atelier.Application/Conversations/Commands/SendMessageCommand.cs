using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Conversations.Commands;

public class SendMessageCommand : IRequest<MessageDto>
{
    public int ConversationId { get; set; }
    public string MessageText { get; set; } = null!;
    public string Sender { get; set; } = "Admin";
    public List<string>? ImageUrls { get; set; }
}

public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, MessageDto>
{
    private readonly IApplicationDbContext _context;
    private readonly INotificationService _notificationService;

    public SendMessageCommandHandler(IApplicationDbContext context, INotificationService notificationService)
    {
        _context = context;
        _notificationService = notificationService;
    }

    public async Task<MessageDto> Handle(SendMessageCommand request, CancellationToken cancellationToken)
    {
        var conversation = await _context.Conversations
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == request.ConversationId, cancellationToken);

        if (conversation == null)
            throw new Exception($"Không tìm thấy hội thoại với ID = {request.ConversationId}");

        var message = new Message
        {
            ConversationId = request.ConversationId,
            Sender = request.Sender,
            MessageText = request.MessageText,
            CreatedAt = DateTime.UtcNow,
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync(cancellationToken);

        if (string.IsNullOrEmpty(conversation.Title) && !string.IsNullOrEmpty(request.MessageText))
        {
            conversation.Title = request.MessageText.Length > 80
                ? request.MessageText[..80] + "..."
                : request.MessageText;
            _context.Conversations.Update(conversation);
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (request.ImageUrls != null && request.ImageUrls.Count > 0)
        {
            foreach (var imgUrl in request.ImageUrls)
            {
                _context.MessageImages.Add(new MessageImage
                {
                    MessageId = message.Id,
                    ImageUrl = imgUrl,
                    CreatedAt = DateTime.UtcNow,
                });
            }
            await _context.SaveChangesAsync(cancellationToken);
        }

        if (request.Sender == "Customer" && (conversation.Type == "Support" || conversation.Type == "Consulting"))
        {
            var preview = request.MessageText;
            if (preview.Length > 100) preview = preview[..100] + "...";

            await _notificationService.SendNotificationAsync(new NotificationDto
            {
                Id = $"msg-{message.Id}",
                Type = "NewMessage",
                Title = "Tin nhắn mới từ khách",
                Body = $"{conversation.User?.FullName ?? "Khách"}: {preview}",
                ReferenceType = conversation.Type == "Consulting" ? "ConsultingConversation" : "Conversation",
                ReferenceId = conversation.Id,
                CreatedAt = message.CreatedAt,
            });
        }

        var imageUrls = await _context.MessageImages
            .Where(i => i.MessageId == message.Id)
            .Select(i => i.ImageUrl)
            .ToListAsync(cancellationToken);

        return new MessageDto
        {
            Id = message.Id,
            ConversationId = message.ConversationId,
            Sender = message.Sender ?? "",
            MessageText = message.MessageText ?? "",
            ImageUrls = imageUrls,
            CreatedAt = message.CreatedAt,
        };
    }
}
