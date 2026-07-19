using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;
using MediatR;

namespace Atelier.Application.CustomRequests.Commands;

public class CreateCustomRequestCommand : IRequest<bool>
{
    public int UserId { get; set; }
    public string? Description { get; set; }
}

public class CreateCustomRequestCommandHandler : IRequestHandler<CreateCustomRequestCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CreateCustomRequestCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(CreateCustomRequestCommand request, CancellationToken cancellationToken)
    {
        var customRequest = new CustomRequest
        {
            UserId = request.UserId,
            Description = request.Description,
            Status = "Pending",
            CreatedAt = DateTime.UtcNow,
        };

        _context.CustomRequests.Add(customRequest);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
