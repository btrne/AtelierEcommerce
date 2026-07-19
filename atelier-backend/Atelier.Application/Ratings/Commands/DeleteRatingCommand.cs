using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Ratings.Commands;

public class DeleteRatingCommand : IRequest<bool>
{
    public int Id { get; set; }
    public DeleteRatingCommand(int id) { Id = id; }
}

public class DeleteRatingCommandHandler : IRequestHandler<DeleteRatingCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRatingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteRatingCommand request, CancellationToken cancellationToken)
    {
        var rating = await _context.Ratings
            .FirstOrDefaultAsync(r => r.Id == request.Id, cancellationToken);

        if (rating == null)
            throw new Exception($"Không tìm thấy đánh giá với ID = {request.Id}");

        _context.Ratings.Remove(rating);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
