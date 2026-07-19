using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;
using Atelier.Domain.Entities;

namespace Atelier.Api.Controllers.Products
{
    [Route("api/[controller]")]
    [ApiController]
    public class WishlistController : ControllerBase
    {
        private readonly IApplicationDbContext _context;

        public WishlistController(IApplicationDbContext context)
        {
            _context = context;
        }

        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetWishlist()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var items = await _context.Wishlists
                .Where(w => w.UserId == userId)
                .Include(w => w.Product)
                .ThenInclude(p => p.ProductVariants)
                .ThenInclude(pv => pv.ProductVariantImages)
                .Select(w => new
                {
                    id = w.ProductId,
                    productId = w.ProductId,
                    productName = w.Product.Name,
                    productImage = w.Product.ProductVariants
                        .OrderBy(v => v.Id)
                        .SelectMany(v => v.ProductVariantImages)
                        .OrderByDescending(img => img.IsPrimary)
                        .Select(img => img.ImageUrl)
                        .FirstOrDefault() ?? "",
                    basePrice = w.Product.ProductVariants
                        .OrderBy(v => v.Id)
                        .Select(v => v.Price)
                        .FirstOrDefault(),
                })
                .ToListAsync();

            return Ok(items);
        }

        [Authorize]
        [HttpPost]
        public async Task<IActionResult> AddToWishlist([FromBody] AddWishlistRequest request)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var existing = await _context.Wishlists
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == request.ProductId);

            if (existing != null)
                return Ok(new { message = "Sản phẩm đã có trong danh sách yêu thích." });

            var wishlist = new Wishlist
            {
                UserId = userId,
                ProductId = request.ProductId,
            };

            _context.Wishlists.Add(wishlist);
            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { message = "Đã thêm vào danh sách yêu thích." });
        }

        [Authorize]
        [HttpDelete("{productId}")]
        public async Task<IActionResult> RemoveFromWishlist(int productId)
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var item = await _context.Wishlists
                .FirstOrDefaultAsync(w => w.UserId == userId && w.ProductId == productId);

            if (item == null)
                return NotFound(new { Error = "Sản phẩm không có trong danh sách yêu thích." });

            _context.Wishlists.Remove(item);
            await _context.SaveChangesAsync(CancellationToken.None);

            return Ok(new { message = "Đã xóa khỏi danh sách yêu thích." });
        }
    }

    public class AddWishlistRequest
    {
        public int ProductId { get; set; }
    }
}
