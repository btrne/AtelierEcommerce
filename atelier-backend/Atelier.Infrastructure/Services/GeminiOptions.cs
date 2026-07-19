namespace Atelier.Infrastructure.Services;

public class GeminiOptions
{
    public string ApiKey { get; set; } = "";
    public string Model { get; set; } = "gemini-1.5-flash";
    public string ApiUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta/models/";
}
