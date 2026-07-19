using MediatR;

namespace Atelier.Application.Carts.Queries
{
    public class GetCartQuery : IRequest<object>
    {
        public int? UserId { get; set; }
        public string? SessionId { get; set; }
    }
}