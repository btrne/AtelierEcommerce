using System.Security.Cryptography;
using System.Text;

namespace Atelier.Application.Common.Security;

public static class PasswordHasher
{
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int Iterations = 210_000;
    private const string Prefix = "PBKDF2-SHA256";

    public static string HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = Rfc2898DeriveBytes.Pbkdf2(
            password,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            HashSize);

        return $"{Prefix}${Iterations}${Convert.ToBase64String(salt)}${Convert.ToBase64String(hash)}";
    }

    public static bool VerifyPassword(string password, string passwordHash)
    {
        if (passwordHash.StartsWith($"{Prefix}$", StringComparison.Ordinal))
            return VerifyPbkdf2(password, passwordHash);

        return VerifyLegacySha256(password, passwordHash);
    }

    public static bool NeedsRehash(string passwordHash)
    {
        if (!passwordHash.StartsWith($"{Prefix}$", StringComparison.Ordinal))
            return true;

        var parts = passwordHash.Split('$');
        return parts.Length != 4 ||
               !int.TryParse(parts[1], out var iterations) ||
               iterations < Iterations;
    }

    private static bool VerifyPbkdf2(string password, string passwordHash)
    {
        var parts = passwordHash.Split('$');
        if (parts.Length != 4 || !int.TryParse(parts[1], out var iterations))
            return false;

        try
        {
            var salt = Convert.FromBase64String(parts[2]);
            var expectedHash = Convert.FromBase64String(parts[3]);
            var actualHash = Rfc2898DeriveBytes.Pbkdf2(
                password,
                salt,
                iterations,
                HashAlgorithmName.SHA256,
                expectedHash.Length);

            return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
        }
        catch (FormatException)
        {
            return false;
        }
    }

    private static bool VerifyLegacySha256(string password, string passwordHash)
    {
        using var sha256 = SHA256.Create();
        var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
        try
        {
            var expectedHash = Convert.FromHexString(passwordHash);
            return CryptographicOperations.FixedTimeEquals(hashedBytes, expectedHash);
        }
        catch (FormatException)
        {
            return false;
        }
    }
}
