using System.Globalization;
using System.Net;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Infrastructure
{
    [Route("api/[controller]")]
    [ApiController]
    public class FilesController : ControllerBase
    {
        private const long DefaultMaxFileSizeBytes = 10 * 1024 * 1024;

        private static readonly Dictionary<string, string[]> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            [".jpg"] = ["image/jpeg"],
            [".jpeg"] = ["image/jpeg"],
            [".png"] = ["image/png"],
            [".gif"] = ["image/gif"],
            [".webp"] = ["image/webp"],
        };

        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public FilesController(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        [Authorize]
        [HttpPost("upload")]
        [RequestSizeLimit(DefaultMaxFileSizeBytes)]
        public async Task<IActionResult> Upload(IFormFile file, CancellationToken cancellationToken)
        {
            if (file == null || file.Length == 0)
                return BadRequest(new { Error = "Please choose a file." });

            var maxFileSizeBytes = GetConfiguredMaxFileSizeBytes();
            if (file.Length > maxFileSizeBytes)
                return BadRequest(new { Error = $"File is too large. Max size is {maxFileSizeBytes / 1024 / 1024} MB." });

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var allowedExtensions = GetAllowedExtensions();
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new
                {
                    Error = $"File type is not supported. Allowed: {string.Join(", ", allowedExtensions)}",
                });
            }

            if (!IsAllowedContentType(extension, file.ContentType))
                return BadRequest(new { Error = "File content type does not match the file extension." });

            if (!await HasValidImageSignatureAsync(file, extension, cancellationToken))
                return BadRequest(new { Error = "File content is not a supported image." });

            var uploadProvider = _configuration["UploadSettings:Provider"];
            var useCloudinary = ShouldUseCloudinary(uploadProvider);
            if (useCloudinary)
            {
                if (!HasCloudinarySettings())
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, new
                    {
                        Error = "Cloudinary upload is enabled but Cloudinary settings are missing.",
                    });
                }

                return await UploadToCloudinaryAsync(file, cancellationToken);
            }

            return await UploadLocallyAsync(file, extension, cancellationToken);
        }

        private async Task<IActionResult> UploadLocallyAsync(
            IFormFile file,
            string extension,
            CancellationToken cancellationToken)
        {
            var uploadsDir = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            Directory.CreateDirectory(uploadsDir);

            var fileName = $"{Guid.NewGuid():N}{extension}";
            var filePath = Path.Combine(uploadsDir, fileName);

            await using (var stream = new FileStream(filePath, FileMode.CreateNew))
            {
                await file.CopyToAsync(stream, cancellationToken);
            }

            var url = $"/uploads/{fileName}";

            return Ok(new { Url = url, FileName = fileName, url, fileName });
        }

        private async Task<IActionResult> UploadToCloudinaryAsync(
            IFormFile file,
            CancellationToken cancellationToken)
        {
            var cloudName = _configuration["Cloudinary:CloudName"]!.Trim();
            var apiKey = _configuration["Cloudinary:ApiKey"]!.Trim();
            var apiSecret = _configuration["Cloudinary:ApiSecret"]!.Trim();
            var folder = _configuration["Cloudinary:Folder"]?.Trim();
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(CultureInfo.InvariantCulture);

            var signatureParameters = new SortedDictionary<string, string>(StringComparer.Ordinal)
            {
                ["timestamp"] = timestamp,
            };
            if (!string.IsNullOrWhiteSpace(folder))
                signatureParameters["folder"] = folder;

            var signature = CreateCloudinarySignature(signatureParameters, apiSecret);
            using var content = new MultipartFormDataContent();
            await using var stream = file.OpenReadStream();
            using var fileContent = new StreamContent(stream);
            fileContent.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);

            content.Add(fileContent, "file", file.FileName);
            content.Add(new StringContent(apiKey), "api_key");
            content.Add(new StringContent(timestamp), "timestamp");
            if (!string.IsNullOrWhiteSpace(folder))
                content.Add(new StringContent(folder), "folder");
            content.Add(new StringContent(signature), "signature");

            var client = _httpClientFactory.CreateClient();
            using var response = await client.PostAsync(
                $"https://api.cloudinary.com/v1_1/{Uri.EscapeDataString(cloudName)}/image/upload",
                content,
                cancellationToken);

            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return StatusCode((int)HttpStatusCode.BadGateway, new
                {
                    Error = "Cloudinary upload failed.",
                    Details = TryReadCloudinaryError(body),
                });
            }

            var upload = JsonSerializer.Deserialize<CloudinaryUploadResponse>(
                body,
                new JsonSerializerOptions(JsonSerializerDefaults.Web));

            if (string.IsNullOrWhiteSpace(upload?.SecureUrl))
            {
                return StatusCode((int)HttpStatusCode.BadGateway, new
                {
                    Error = "Cloudinary upload response did not include a secure URL.",
                });
            }

            var fileName = upload.PublicId ?? Path.GetFileNameWithoutExtension(file.FileName);
            return Ok(new
            {
                Url = upload.SecureUrl,
                FileName = fileName,
                PublicId = upload.PublicId,
                url = upload.SecureUrl,
                fileName,
                publicId = upload.PublicId,
            });
        }

        private long GetConfiguredMaxFileSizeBytes()
        {
            var maxFileSizeMb = _configuration.GetValue<int?>("UploadSettings:MaxFileSizeMB");
            if (maxFileSizeMb is null or <= 0)
                return DefaultMaxFileSizeBytes;

            return maxFileSizeMb.Value * 1024L * 1024L;
        }

        private HashSet<string> GetAllowedExtensions()
        {
            var configured = _configuration
                .GetSection("UploadSettings:AllowedExtensions")
                .Get<List<string>>() ?? [.. AllowedContentTypes.Keys];

            return configured
                .Select(ext => ext.Trim().ToLowerInvariant())
                .Where(ext => AllowedContentTypes.ContainsKey(ext))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        private static bool IsAllowedContentType(string extension, string? contentType)
        {
            return !string.IsNullOrWhiteSpace(contentType) &&
                   AllowedContentTypes.TryGetValue(extension, out var contentTypes) &&
                   contentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase);
        }

        private bool ShouldUseCloudinary(string? provider)
        {
            if (string.Equals(provider, "Local", StringComparison.OrdinalIgnoreCase))
                return false;

            return string.Equals(provider, "Cloudinary", StringComparison.OrdinalIgnoreCase) ||
                   (string.IsNullOrWhiteSpace(provider) && HasCloudinarySettings());
        }

        private bool HasCloudinarySettings()
        {
            return HasUsableSetting("Cloudinary:CloudName") &&
                   HasUsableSetting("Cloudinary:ApiKey") &&
                   HasUsableSetting("Cloudinary:ApiSecret");
        }

        private bool HasUsableSetting(string key)
        {
            var value = _configuration[key]?.Trim();
            return !string.IsNullOrWhiteSpace(value) &&
                   !value.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase) &&
                   !value.StartsWith("your_", StringComparison.OrdinalIgnoreCase);
        }

        private static string CreateCloudinarySignature(
            IReadOnlyDictionary<string, string> parameters,
            string apiSecret)
        {
            var payload = string.Join(
                "&",
                parameters
                    .Where(pair => !string.IsNullOrWhiteSpace(pair.Value))
                    .OrderBy(pair => pair.Key, StringComparer.Ordinal)
                    .Select(pair => $"{pair.Key}={pair.Value}")) + apiSecret;

            var hash = SHA1.HashData(Encoding.UTF8.GetBytes(payload));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        private static string TryReadCloudinaryError(string responseBody)
        {
            try
            {
                var error = JsonSerializer.Deserialize<CloudinaryErrorResponse>(
                    responseBody,
                    new JsonSerializerOptions(JsonSerializerDefaults.Web));
                return error?.Error?.Message ?? responseBody;
            }
            catch (JsonException)
            {
                return responseBody;
            }
        }

        private static async Task<bool> HasValidImageSignatureAsync(
            IFormFile file,
            string extension,
            CancellationToken cancellationToken)
        {
            var header = new byte[12];
            await using var stream = file.OpenReadStream();
            var bytesRead = await stream.ReadAsync(header.AsMemory(0, header.Length), cancellationToken);

            return extension switch
            {
                ".jpg" or ".jpeg" => bytesRead >= 3 &&
                                     header[0] == 0xFF &&
                                     header[1] == 0xD8 &&
                                     header[2] == 0xFF,
                ".png" => bytesRead >= 8 &&
                          header[0] == 0x89 &&
                          header[1] == 0x50 &&
                          header[2] == 0x4E &&
                          header[3] == 0x47 &&
                          header[4] == 0x0D &&
                          header[5] == 0x0A &&
                          header[6] == 0x1A &&
                          header[7] == 0x0A,
                ".gif" => bytesRead >= 6 &&
                          header[0] == 0x47 &&
                          header[1] == 0x49 &&
                          header[2] == 0x46 &&
                          header[3] == 0x38 &&
                          (header[4] == 0x37 || header[4] == 0x39) &&
                          header[5] == 0x61,
                ".webp" => bytesRead >= 12 &&
                           header[0] == 0x52 &&
                           header[1] == 0x49 &&
                           header[2] == 0x46 &&
                           header[3] == 0x46 &&
                           header[8] == 0x57 &&
                           header[9] == 0x45 &&
                           header[10] == 0x42 &&
                           header[11] == 0x50,
                _ => false,
            };
        }

        private sealed record CloudinaryUploadResponse(
            [property: JsonPropertyName("secure_url")] string? SecureUrl,
            [property: JsonPropertyName("public_id")] string? PublicId);

        private sealed record CloudinaryErrorResponse(
            [property: JsonPropertyName("error")] CloudinaryError? Error);

        private sealed record CloudinaryError(
            [property: JsonPropertyName("message")] string? Message);
    }
}
