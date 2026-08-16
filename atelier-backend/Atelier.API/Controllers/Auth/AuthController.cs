using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Atelier.Application.Common.Interfaces;
using Atelier.Api.Services;
using Atelier.Domain.Entities;
using Google.Apis.Auth;
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
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public AuthController(IApplicationDbContext context, ITokenService tokenService, IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _context = context;
            _tokenService = tokenService;
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
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

        [HttpPost("google")]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.IdToken))
                return BadRequest(new { Error = "Thiếu Google ID token." });

            var clientId = _configuration["OAuth:Google:ClientId"];
            if (string.IsNullOrEmpty(clientId))
                return BadRequest(new { Error = "Chưa cấu hình Google ClientId." });

            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken,
                    new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } });
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = $"Token Google không hợp lệ: {ex.Message}" });
            }

            if (string.IsNullOrWhiteSpace(payload.Email))
                return BadRequest(new { Error = "Không thể lấy email từ tài khoản Google." });

            if (!payload.EmailVerified)
                return BadRequest(new { Error = "Email Google chưa được xác minh. Vui lòng xác minh email với Google trước khi đăng nhập." });

            User user;
            try
            {
                user = await FindOrCreateExternalUserAsync("Google", payload.Subject, payload.Email, payload.Name ?? payload.Email);
            }
            catch (ExternalLoginConflictException ex)
            {
                return Conflict(new { Error = ex.Message });
            }

            if (!user.IsActive)
                return BadRequest(new { Error = "Tài khoản đã bị vô hiệu hóa." });

            var roles = user.UserRoles
                .Where(ur => ur.Role != null && ur.Role.IsActive)
                .Select(ur => ur.Role.Code)
                .ToList();

            var token = _tokenService.GenerateToken(user, roles);

            return Ok(new AuthResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Token = token,
                Roles = roles,
            });
        }

        [HttpPost("facebook")]
        public async Task<IActionResult> FacebookLogin([FromBody] FacebookLoginRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.AccessToken))
                return BadRequest(new { Error = "Thiếu Facebook access token." });

            var appId = _configuration["OAuth:Facebook:AppId"]?.Trim();
            var appSecret = _configuration["OAuth:Facebook:AppSecret"]?.Trim();
            if (string.IsNullOrEmpty(appId) || string.IsNullOrEmpty(appSecret))
                return BadRequest(new { Error = "Chưa cấu hình Facebook AppId/AppSecret." });

            var http = _httpClientFactory.CreateClient("Facebook");

            var debugUrl = $"https://graph.facebook.com/debug_token?input_token={Uri.EscapeDataString(request.AccessToken)}&access_token={Uri.EscapeDataString(appId + "|" + appSecret)}";
            HttpResponseMessage debugResponse;
            try
            {
                debugResponse = await http.GetAsync(debugUrl);
            }
            catch (Exception ex)
            {
                return BadRequest(new { Error = $"Lỗi kết nối Facebook: {ex.Message}" });
            }

            if (!debugResponse.IsSuccessStatusCode)
                return BadRequest(new { Error = "Token Facebook không hợp lệ hoặc đã hết hạn." });

            var debugPayload = JsonSerializer.Deserialize<FacebookDebugTokenPayload>(await debugResponse.Content.ReadAsStringAsync());
            var tokenAppId = debugPayload?.Data?.AppIdValue;
            if (debugPayload?.Data == null || debugPayload.Data.IsValid != true || !string.Equals(tokenAppId, appId, StringComparison.Ordinal))
                return BadRequest(new { Error = "Token Facebook không hợp lệ." });

            var meUrl = $"https://graph.facebook.com/me?fields=id,name,email&access_token={Uri.EscapeDataString(request.AccessToken)}";
            var meResponse = await http.GetAsync(meUrl);
            if (!meResponse.IsSuccessStatusCode)
                return BadRequest(new { Error = "Không thể lấy thông tin tài khoản Facebook." });

            var payload = JsonSerializer.Deserialize<FacebookUserPayload>(await meResponse.Content.ReadAsStringAsync());
            if (payload == null || string.IsNullOrWhiteSpace(payload.Id))
                return BadRequest(new { Error = "Không đọc được thông tin tài khoản Facebook." });

            if (string.IsNullOrWhiteSpace(payload.Email))
                return BadRequest(new { Error = "Không thể lấy email từ tài khoản Facebook. Vui lòng cho phép quyền email." });

            User user;
            try
            {
                user = await FindOrCreateExternalUserAsync("Facebook", payload.Id, payload.Email, payload.Name ?? payload.Email);
            }
            catch (ExternalLoginConflictException ex)
            {
                return Conflict(new { Error = ex.Message });
            }

            if (!user.IsActive)
                return BadRequest(new { Error = "Tài khoản đã bị vô hiệu hóa." });

            var roles = user.UserRoles
                .Where(ur => ur.Role != null && ur.Role.IsActive)
                .Select(ur => ur.Role.Code)
                .ToList();

            var token = _tokenService.GenerateToken(user, roles);

            return Ok(new AuthResponse
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Token = token,
                Roles = roles,
            });
        }

        private async Task<User> FindOrCreateExternalUserAsync(string provider, string providerId, string email, string fullName)
        {
            var user = await _context.Users
                .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
                .FirstOrDefaultAsync(u => u.Provider == provider && u.ProviderId == providerId);

            if (user != null)
                return user;

            var emailExists = await _context.Users.AnyAsync(u => u.Email == email);
            if (emailExists)
                throw new ExternalLoginConflictException($"Email này đã có tài khoản. Vui lòng đăng nhập bằng mật khẩu rồi liên kết {provider} trong trang tài khoản.");

            var customerRole = await _context.Roles.FirstOrDefaultAsync(r => r.Code == "Customer" && r.IsActive);
            if (customerRole == null)
            {
                customerRole = new Role { Code = "Customer", Name = "Khách hàng", IsActive = true };
                _context.Roles.Add(customerRole);
            }

            user = new User
            {
                Email = email,
                PasswordHash = HashPassword(Guid.NewGuid().ToString("N")),
                FullName = fullName,
                Phone = "",
                Provider = provider,
                ProviderId = providerId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
            };
            user.UserRoles.Add(new UserRole { Role = customerRole });
            _context.Users.Add(user);
            await _context.SaveChangesAsync(CancellationToken.None);
            return user;
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

        public class GoogleLoginRequest
        {
            public string IdToken { get; set; } = null!;
        }

        public class FacebookLoginRequest
        {
            public string AccessToken { get; set; } = null!;
        }

        public class FacebookUserPayload
        {
            [JsonPropertyName("id")]
            public string Id { get; set; } = null!;

            [JsonPropertyName("name")]
            public string? Name { get; set; }

            [JsonPropertyName("email")]
            public string? Email { get; set; }
        }

        public class FacebookDebugTokenPayload
        {
            [JsonPropertyName("data")]
            public FacebookDebugTokenData? Data { get; set; }
        }

        public class FacebookDebugTokenData
        {
            [JsonPropertyName("is_valid")]
            public bool? IsValid { get; set; }

            [JsonPropertyName("app_id")]
            public JsonElement AppId { get; set; }

            [JsonIgnore]
            public string? AppIdValue => ReadFacebookId(AppId);

            [JsonPropertyName("user_id")]
            public JsonElement UserId { get; set; }

            [JsonIgnore]
            public string? UserIdValue => ReadFacebookId(UserId);

            private static string? ReadFacebookId(JsonElement value)
            {
                return value.ValueKind switch
                {
                    JsonValueKind.String => value.GetString(),
                    JsonValueKind.Number => value.GetRawText(),
                    _ => null
                };
            }
        }

        private class ExternalLoginConflictException : Exception
        {
            public ExternalLoginConflictException(string message) : base(message)
            {
            }
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
