using Atelier.Application.Common.Interfaces;
using Atelier.Application.Recommendations.Services;
using Atelier.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Atelier.Infrastructure.Services;

public class AprioriRuleGenerationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<AprioriRuleGenerationService> _logger;

    public AprioriRuleGenerationService(IServiceProvider serviceProvider, ILogger<AprioriRuleGenerationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("AprioriRuleGenerationService started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await GenerateRulesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating Apriori rules.");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }

    private async Task GenerateRulesAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var recommender = new AprioriRecommender(context);

        _logger.LogInformation("Generating Apriori rules...");

        var rules = await recommender.GenerateRulesAsync(cancellationToken);

        var existingRules = await context.ProductAssociationRules.ToListAsync(cancellationToken);
        context.ProductAssociationRules.RemoveRange(existingRules);
        await context.SaveChangesAsync(cancellationToken);

        if (rules.Count > 0)
        {
            var entities = rules.Select(r => new ProductAssociationRule
            {
                SourceProductId = r.SourceProductId,
                RecommendedProductId = r.RecommendedProductId,
                Confidence = r.Confidence,
                Lift = r.Lift,
                UpdatedAt = DateTime.UtcNow,
            }).ToList();

            context.ProductAssociationRules.AddRange(entities);
            await context.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("Apriori rules generated: {Count} rules.", rules.Count);
    }
}
