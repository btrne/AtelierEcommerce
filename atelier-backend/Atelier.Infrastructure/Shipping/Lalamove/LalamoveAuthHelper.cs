using System.Security.Cryptography;
using System.Text;

namespace Atelier.Infrastructure.Shipping.Lalamove;

public static class LalamoveAuthHelper
{
    public static string HmacSha256Hex(string message, string secret)
    {
        var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(message));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }

    public static string BuildToken(string method, string path, string jsonBody, string publicKey, string secretKey)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var rawSig = $"{timestamp}\r\n{method}\r\n{path}\r\n\r\n{jsonBody}";
        var signature = HmacSha256Hex(rawSig, secretKey);
        return $"hmac {publicKey}:{timestamp}:{signature}";
    }
}
