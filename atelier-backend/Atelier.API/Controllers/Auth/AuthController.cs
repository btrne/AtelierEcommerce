using System.Security.Cryptography;
using System.Text;
using Atelier.Application.Common.Interfaces;
using Atelier.Api.Services;
using Atelier.Domain.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Api.Controllers.Auth
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IApplicationDbContext _context;
        private readonly ITokenService _tokenService;

        public AuthController(IApplicationDbContext context, ITokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { Error = "Email và mật khẩu là bắt buộc." });
            }

            var user = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Email == request.Email);

            if (user == null || string.IsNullOrWhiteSpace(user.PasswordHash) || !VerifyPassword(request.Password, user.PasswordHash))
            {
                return BadRequest(new { Error = "Email hoặc mật khẩu không hợp lệ." });
            }

            if (!user.IsActive)
            {
                return BadRequest(new { Error = "Tài khoản đã bị vô hiệu hóa." });
            }

            var roles = user.UserRoles
                .Where(ur => ur.Role != null && ur.Role.IsActive)
                .Select(ur => ur.Role.Code)
                .ToList();

            var token = _tokenService.GenerateToken(user, roles);

            var response = new AuthResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Token = token,
                Roles = roles,
            };

            return Ok(response);
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.FullName))
            {
                return BadRequest(new { Error = "Email, tên và mật khẩu là bắt buộc." });
            }

            var existingUser = await _context.Users.AnyAsync(u => u.Email == request.Email);
            if (existingUser)
            {
                return BadRequest(new { Error = "Email đã được sử dụng." });
            }

            var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Code == "Customer" && r.IsActive);
            if (customerRole == null)
            {
                customerRole = new Role { Code = "Customer", Name = "Khách hàng", IsActive = true };
                _context.Roles.Add(customerRole);
            }

            var user = new User
            {
                Email = request.Email,
                PasswordHash = HashPassword(request.Password),
                FullName = request.FullName,
                Phone = request.Phone ?? "",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };

            user.UserRoles.Add(new UserRole { Role = customerRole });
            _context.Users.Add(user);
            await _context.SaveChangesAsync(CancellationToken.None);

            var roles = new List<string> { "Customer" };
            var token = _tokenService.GenerateToken(user, roles);

            var response = new AuthResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Token = token,
                Roles = roles,
            };

            return Ok(response);
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
                return Unauthorized();

            var user = await _context.Users
                .Include(u => u.UserRoles)
                    .ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound();

            var roles = user.UserRoles
                .Where(ur => ur.Role != null && ur.Role.IsActive)
                .Select(ur => ur.Role.Code)
                .ToList();

            return Ok(new AuthResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Roles = roles,
            });
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToHexString(hashedBytes);
        }

        private static bool VerifyPassword(string password, string passwordHash)
        {
            return HashPassword(password) == passwordHash;
        }

        public class LoginRequest
        {
            public string Email { get; set; } = null!;
            public string Password { get; set; } = null!;
        }

        public class RegisterRequest
        {
            public string Email { get; set; } = null!;
            public string Password { get; set; } = null!;
            public string FullName { get; set; } = null!;
            public string? Phone { get; set; }
        }

        public class AuthResponse
        {
            public int Id { get; set; }
            public string Email { get; set; } = null!;
            public string? FullName { get; set; }
            public string? Token { get; set; }
            public List<string> Roles { get; set; } = new();
        }
    }
}
