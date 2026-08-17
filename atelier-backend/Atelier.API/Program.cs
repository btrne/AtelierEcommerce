using System.Text;
using System.Text.Json.Serialization;
using Atelier.Api.Converters;
using Atelier.Api.Services;
using Atelier.Application.Common.Interfaces;
using Atelier.Infrastructure.Data;
using Atelier.Infrastructure.Data.Seeds;
using Atelier.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var configuredCorsOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .Get<string[]>() ?? Array.Empty<string>();
var frontendBaseUrl = builder.Configuration["Frontend:BaseUrl"];
var allowedCorsOrigins = configuredCorsOrigins
    .Concat(string.IsNullOrWhiteSpace(frontendBaseUrl) ? Array.Empty<string>() : new[] { frontendBaseUrl })
    .Concat(builder.Environment.IsDevelopment()
        ? new[]
        {
            "http://localhost:3000",
            "https://localhost:3000",
            "http://localhost:3001",
            "https://localhost:3001",
            "http://127.0.0.1:3000",
            "https://127.0.0.1:3000",
            "http://127.0.0.1:3001",
            "https://127.0.0.1:3001",
        }
        : Array.Empty<string>())
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(NormalizeOrigin)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (allowedCorsOrigins.Length == 0)
    throw new InvalidOperationException("Configure at least one Cors:AllowedOrigins value.");

// 1. Cấu hình Database & Giao diện (DI)
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<IApplicationDbContext, ApplicationDbContext>();

// 2. Cấu hình MediatR (CQRS)
builder.Services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(Atelier.Application.Products.Queries.GetAllProductsQuery).Assembly));

// 3. DI Services
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<Atelier.Application.Recommendations.Services.KnnRecommender>();
builder.Services.AddScoped<Atelier.Application.Payments.Services.IVnPayService, Atelier.Application.Payments.Services.VnPayService>();
builder.Services.AddScoped<LocationSeeder>();

// 3a. GHN Shipping Services
builder.Services.Configure<Atelier.Application.Shipping.Services.GhnOptions>(builder.Configuration.GetSection("GHN"));
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<Atelier.Infrastructure.Shipping.GHN.GhnApiClient>();
builder.Services.AddHttpClient("Facebook");
builder.Services.AddSingleton<Atelier.Infrastructure.Shipping.GHN.GhnLocationCache>();
builder.Services.AddScoped<Atelier.Infrastructure.Shipping.GHN.GhnFeeService>();
builder.Services.AddScoped<Atelier.Application.Shipping.Services.IShippingFeeService>(sp => sp.GetRequiredService<Atelier.Infrastructure.Shipping.GHN.GhnFeeService>());
builder.Services.AddScoped<Atelier.Infrastructure.Shipping.GHN.GhnShippingService>();
builder.Services.AddScoped<Atelier.Application.Shipping.Services.IShippingService>(sp => sp.GetRequiredService<Atelier.Infrastructure.Shipping.GHN.GhnShippingService>());

// 3b. AI Chat Service (Gemini)
builder.Services.Configure<Atelier.Infrastructure.Services.GeminiOptions>(builder.Configuration.GetSection("Gemini"));
builder.Services.AddHttpClient<Atelier.Application.Common.Interfaces.IAiService, Atelier.Infrastructure.Services.GeminiAiService>();

// 3c. Lalamove Shipping Services
builder.Services.Configure<Atelier.Infrastructure.Shipping.Lalamove.LalamoveOptions>(builder.Configuration.GetSection("Lalamove"));
builder.Services.AddHttpClient<Atelier.Infrastructure.Shipping.Common.NominatimGeocodingService>();
builder.Services.AddSingleton<Atelier.Application.Shipping.Services.IGeocodingService>(sp => sp.GetRequiredService<Atelier.Infrastructure.Shipping.Common.NominatimGeocodingService>());
builder.Services.AddHttpClient<Atelier.Infrastructure.Shipping.Lalamove.LalamoveFeeService>();
builder.Services.AddScoped<Atelier.Infrastructure.Shipping.Lalamove.LalamoveFeeService>();
builder.Services.AddScoped<Atelier.Application.Shipping.Services.IShippingFeeService>(sp => sp.GetRequiredService<Atelier.Infrastructure.Shipping.Lalamove.LalamoveFeeService>());
builder.Services.AddHttpClient<Atelier.Infrastructure.Shipping.Lalamove.LalamoveShippingService>();
builder.Services.AddScoped<Atelier.Infrastructure.Shipping.Lalamove.LalamoveShippingService>();
builder.Services.AddScoped<Atelier.Application.Shipping.Services.IShippingService>(sp => sp.GetRequiredService<Atelier.Infrastructure.Shipping.Lalamove.LalamoveShippingService>());

// 3d. SSE Notification
builder.Services.AddSingleton<NotificationBroadcaster>();
builder.Services.AddScoped<INotificationService, NotificationService>();

// 3c. Shipment tracking & polling
builder.Services.AddScoped<Atelier.Infrastructure.Shipping.Common.ShipmentStatusService>();
builder.Services.AddHttpClient<Atelier.Infrastructure.Shipping.Lalamove.LalamoveTracker>();
builder.Services.AddScoped<Atelier.Application.Shipping.Services.IShipmentTracker>(sp => sp.GetRequiredService<Atelier.Infrastructure.Shipping.Lalamove.LalamoveTracker>());
builder.Services.AddScoped<Atelier.Infrastructure.Shipping.GHN.GhnTracker>();
builder.Services.AddScoped<Atelier.Application.Shipping.Services.IShipmentTracker>(sp => sp.GetRequiredService<Atelier.Infrastructure.Shipping.GHN.GhnTracker>());
builder.Services.Configure<Atelier.Infrastructure.Shipping.Common.ShipmentPollingOptions>(builder.Configuration.GetSection("ShipmentPolling"));
builder.Services.AddHostedService<Atelier.Infrastructure.Shipping.Common.ShipmentPollingService>();
builder.Services.AddHostedService<Atelier.Infrastructure.Services.AprioriRuleGenerationService>();
builder.Services.AddHostedService<Atelier.Infrastructure.Services.ComboSuggestionService>();

var timeZoneId = builder.Configuration["TimeZone:Id"] ?? "SE Asia Standard Time";
builder.Services.AddSingleton<IDateTime>(_ => new DateTimeService(timeZoneId));

// 4. JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = RequireSetting(builder.Configuration, "JwtSettings:SecretKey", minLength: 32);
var jwtIssuer = RequireSetting(builder.Configuration, "JwtSettings:Issuer");
var jwtAudience = RequireSetting(builder.Configuration, "JwtSettings:Audience");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.FromMinutes(1),
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            if (!string.IsNullOrEmpty(context.Token))
                return Task.CompletedTask;

            var accessToken = context.Request.Query["access_token"];
            if (!string.IsNullOrEmpty(accessToken) &&
                context.HttpContext.Request.Path.StartsWithSegments("/api/admin/notifications/stream"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

builder.Services.AddAuthorization();

// 5. QUAN TRỌNG: Bật tính năng quét Controllers
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter());
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// 6. QUAN TRỌNG: Cấu hình giao diện Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// 7. CORS cho tất cả Frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendOnly",
        policy => policy.WithOrigins(allowedCorsOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod()
                        .AllowCredentials());
});

var app = builder.Build();

app.UseCors("FrontendOnly");

// 8. Bật giao diện web Swagger khi chạy Dev
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// 9. Static files cho upload
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// 10. Seed location data on startup
using (var scope = app.Services.CreateScope())
{
    var seeder = scope.ServiceProvider.GetRequiredService<LocationSeeder>();
    await seeder.SeedAsync();
}

// 11. Health check for demo/deploy warm-up
app.MapGet("/health", async (ApplicationDbContext db, CancellationToken cancellationToken) =>
{
    var databaseReachable = await db.Database.CanConnectAsync(cancellationToken);
    return Results.Ok(new
    {
        status = databaseReachable ? "Healthy" : "Degraded",
        database = databaseReachable ? "Reachable" : "Unreachable",
        environment = app.Environment.EnvironmentName,
        utc = DateTimeOffset.UtcNow,
    });
}).AllowAnonymous();

// 12. Controllers
app.MapControllers();

app.Run();

static string NormalizeOrigin(string origin)
{
    return origin.Trim().TrimEnd('/');
}

static string RequireSetting(IConfiguration configuration, string key, int minLength = 1)
{
    var value = configuration[key]?.Trim();
    if (string.IsNullOrWhiteSpace(value) ||
        value.Length < minLength ||
        value.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException($"{key} is not configured securely.");
    }

    return value;
}
