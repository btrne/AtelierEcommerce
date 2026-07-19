using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.CustomRequests.Commands;

public class DeleteCustomRequestCommand : IRequest<bool>
{
    public int Id { get; set; }
}

public class DeleteCustomRequestCommandHandler : IRequestHandler<DeleteCustomRequestCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteCustomRequestCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteCustomRequestCommand request, CancellationToken cancellationToken)
    {
        var customRequest = await _context.CustomRequests
            .FirstOrDefaultAsync(cr => cr.Id == request.Id, cancellationToken);

        if (customRequest == null)
        {
            throw new Exception($"Không tìm thấy yêu cầu chế tác với ID = {request.Id}");
        }

        _context.CustomRequests.Remove(customRequest);
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}