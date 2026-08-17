using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Atelier.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace Atelier.Api.Services;

public interface ITokenService
{
    string GenerateToken(User user, List<string> roles);
}

public class TokenService : ITokenService
{
    private readonly IConfiguration _configuration;

    public TokenService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public string GenerateToken(User user, List<string> roles)
    {
        var jwtSettings = _configuration.GetSection("JwtSettings");
        var secretKey = RequireSetting(jwtSettings, "SecretKey", minLength: 32);
        var issuer = RequireSetting(jwtSettings, "Issuer");
        var audience = RequireSetting(jwtSettings, "Audience");
        if (!int.TryParse(jwtSettings["ExpirationMinutes"], out var expirationMinutes) || expirationMinutes <= 0)
            throw new InvalidOperationException("JwtSettings:ExpirationMinutes is not configured securely.");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Name, user.FullName),
        };

        claims.AddRange(roles.Select(role => new Claim(ClaimTypes.Role, role)));

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expirationMinutes),
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string RequireSetting(IConfigurationSection section, string key, int minLength = 1)
    {
        var value = section[key]?.Trim();
        if (string.IsNullOrWhiteSpace(value) ||
            value.Length < minLength ||
            value.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"JwtSettings:{key} is not configured securely.");
        }

        return value;
    }
}
