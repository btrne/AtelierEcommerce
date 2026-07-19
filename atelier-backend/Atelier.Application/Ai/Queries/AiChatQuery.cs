using Atelier.Application.Common.Interfaces;
using Atelier.Application.DTOs;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Ai.Queries;

public class AiChatQuery : IRequest<AiChatResult>
{
    public int? UserId { get; set; }
    public string Message { get; set; } = null!;
    public List<AiChatHistoryItem>? History { get; set; }
    public int? ConversationId { get; set; }
}

public class AiChatQueryHandler : IRequestHandler<AiChatQuery, AiChatResult>
{
    private readonly IApplicationDbContext _context;
    private readonly IAiService _aiService;
    private readonly INotificationService _notificationService;

    public AiChatQueryHandler(IApplicationDbContext context, IAiService aiService, INotificationService notificationService)
    {
        _context = context;
        _aiService = aiService;
        _notificationService = notificationService;
    }

    public async Task<AiChatResult> Handle(AiChatQuery request, CancellationToken cancellationToken)
    {
        var aiRequest = new AiChatRequest
        {
            UserId = request.UserId,
            Message = request.Message,
            History = request.History,
        };

        var result = await _aiService.ChatAsync(aiRequest, cancellationToken);

        if (!request.UserId.HasValue && result.TransferTo != null)
        {
            result.Reply = "Cảm ơn bạn đã quan tâm! Để được tư vấn chi tiết về sản phẩm chế tác riêng, vui lòng đăng nhập hoặc đăng ký tài khoản để đội ngũ Atelier có thể hỗ trợ bạn trực tiếp.";
            result.TransferTo = null;
            result.TransferReason = null;
        }

        if (request.UserId.HasValue)
        {
            var userId = request.UserId.Value;
            var targetType = result.TransferTo ?? "AI";

            Conversation conversation;

            if (request.ConversationId.HasValue)
            {
                conversation = await _context.Conversations
                    .Include(c => c.User)
                    .FirstOrDefaultAsync(c => c.Id == request.ConversationId.Value && c.UserId == userId, cancellationToken)
                    ?? throw new Exception("Không tìm thấy hội thoại");
            }
            else
            {
                conversation = new Conversation
                {
                    UserId = userId,
                    Type = targetType,
                    StartedAt = DateTime.UtcNow,
                };
                _context.Conversations.Add(conversation);
                await _context.SaveChangesAsync(cancellationToken);
            }

            if (string.IsNullOrEmpty(conversation.Title) && !string.IsNullOrEmpty(request.Message))
            {
                conversation.Title = request.Message.Length > 80 ? request.Message[..80] + "..." : request.Message;
            }

            if (result.TransferTo != null && conversation.Type != result.TransferTo)
            {
                conversation.Type = result.TransferTo;
            }

            _context.Conversations.Update(conversation);

            var userMessage = new Message
            {
                ConversationId = conversation.Id,
                Sender = "Customer",
                MessageText = request.Message,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Messages.Add(userMessage);

            var aiMessage = new Message
            {
                ConversationId = conversation.Id,
                Sender = "AI",
                MessageText = result.Reply,
                CreatedAt = DateTime.UtcNow,
            };
            _context.Messages.Add(aiMessage);

            await _context.SaveChangesAsync(cancellationToken);

            result.ConversationId = conversation.Id;

            if (result.ProductSuggestions?.Count > 0)
            {
                foreach (var suggestion in result.ProductSuggestions)
                {
                    _context.MessageProductSuggestions.Add(new MessageProductSuggestion
                    {
                        MessageId = aiMessage.Id,
                        ProductId = suggestion.Id,
                        ProductName = suggestion.Name,
                        Description = suggestion.Description,
                        Price = suggestion.Price,
                        PriceMin = suggestion.PriceMin,
                        PriceMax = suggestion.PriceMax,
                        ImageUrl = suggestion.ImageUrl,
                        Slug = suggestion.Slug,
                        CategoryName = suggestion.CategoryName,
                        CreatedAt = DateTime.UtcNow,
                    });
                }
                await _context.SaveChangesAsync(cancellationToken);
            }

            if (result.TransferTo != null && (result.TransferTo == "Support" || result.TransferTo == "Consulting"))
            {
                var userName = await _context.Users
                    .Where(u => u.Id == userId)
                    .Select(u => u.FullName)
                    .FirstOrDefaultAsync(cancellationToken) ?? "Khách";

                await _notificationService.SendNotificationAsync(new NotificationDto
                {
                    Id = $"conv-{conversation.Id}",
                    Type = "NewConversation",
                    Title = result.TransferTo == "Support" ? "Yêu cầu hỗ trợ mới" : "Yêu cầu chế tác mới",
                    Body = $"{userName}: {request.Message}",
                    ReferenceType = result.TransferTo == "Consulting" ? "ConsultingConversation" : "Conversation",
                    ReferenceId = conversation.Id,
                    CreatedAt = DateTime.UtcNow,
                });
            }
        }

        return result;
    }
}
