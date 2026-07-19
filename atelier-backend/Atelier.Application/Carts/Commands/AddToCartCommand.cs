using MediatR;

namespace Atelier.Application.Carts.Commands
{
    public class AddToCartCommand : IRequest<int>
    {
        public int? UserId { get; set; }
        public string? SessionId { get; set; }
        public int ProductVariantId { get; set; }
        public int Quantity { get; set; }
    }
}