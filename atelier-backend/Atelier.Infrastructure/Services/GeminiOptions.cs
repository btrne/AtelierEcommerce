namespace Atelier.Infrastructure.Services;

public class GeminiOptions
{
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gemini-3.1-flash-lite";
    public string ApiUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta/models/";
}
