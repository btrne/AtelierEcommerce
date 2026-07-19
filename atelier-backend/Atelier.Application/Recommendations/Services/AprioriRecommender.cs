using Atelier.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Recommendations.Services;

public class AprioriResult
{
    public int SourceProductId { get; set; }
    public int RecommendedProductId { get; set; }
    public double Confidence { get; set; }
    public double Lift { get; set; }
}

public class FrequentItemset
{
    public List<int> ProductIds { get; set; } = new();
    public double Support { get; set; }
    public double Confidence { get; set; }
    public double Lift { get; set; }
}

public record UtilityItem(int ProductId, int Quantity, decimal UnitPrice);

public class HighUtilityItemsetResult
{
    public List<int> ProductIds { get; set; } = new();
    public decimal TotalUtility { get; set; }
    public decimal WeightedUtility { get; set; }
    public int TransactionCount { get; set; }
    public double Support { get; set; }
    public double Confidence { get; set; }
    public double Lift { get; set; }
    public decimal SuggestedDiscountPercent { get; set; }
}

public class AprioriRecommender
{
    private readonly IApplicationDbContext _context;

    private const double MinSupport = 0.02;
    private const double MinConfidence = 0.3;
    private const decimal MinWeightedUtility = 2_000_000m;
    private const int MaxItemsetSize = 4;

    public AprioriRecommender(IApplicationDbContext context)
    {
        _context = context;
    }

    private async Task<List<List<int>>> LoadTransactionsAsync(CancellationToken cancellationToken)
    {
        return await _context.OrderItems
            .Where(oi => oi.Order.OrderStatus == "Completed" && oi.ProductVariant != null)
            .GroupBy(oi => oi.OrderId)
            .Select(g => g
                .Select(oi => oi.ProductVariant!.ProductId)
                .Distinct()
                .ToList())
            .ToListAsync(cancellationToken);
    }

    private async Task<List<(int OrderId, List<UtilityItem> Items)>> LoadUtilityTransactionsAsync(
        CancellationToken cancellationToken)
    {
        var orderItems = await _context.OrderItems
            .Where(oi => oi.Order.OrderStatus == "Completed" && oi.ProductVariant != null)
            .Select(oi => new
            {
                oi.OrderId,
                ProductId = oi.ProductVariant!.ProductId,
                oi.Quantity,
                oi.UnitPrice
            })
            .ToListAsync(cancellationToken);

        return orderItems
            .GroupBy(x => x.OrderId)
            .Select(g => (
                OrderId: g.Key,
                Items: g.GroupBy(x => x.ProductId)
                    .Select(pg => new UtilityItem(
                        pg.Key,
                        pg.Sum(x => x.Quantity),
                        pg.Average(x => x.UnitPrice)))
                    .ToList()))
            .ToList();
    }

    public async Task<List<AprioriResult>> GenerateRulesAsync(CancellationToken cancellationToken = default)
    {
        var transactions = await LoadTransactionsAsync(cancellationToken);
        var totalTransactions = transactions.Count;
        if (totalTransactions == 0) return new List<AprioriResult>();

        var productCounts = CountProductFrequency(transactions);
        if (productCounts.Count == 0) return new List<AprioriResult>();

        var frequentProducts = GetFrequentItems(productCounts, totalTransactions);

        var pairCounts = new Dictionary<(int, int), int>();
        foreach (var t in transactions)
        {
            var items = t.Where(p => frequentProducts.Contains(p)).Distinct().ToList();
            for (var i = 0; i < items.Count; i++)
            {
                for (var j = i + 1; j < items.Count; j++)
                {
                    var key = (Math.Min(items[i], items[j]), Math.Max(items[i], items[j]));
                    pairCounts.TryGetValue(key, out var count);
                    pairCounts[key] = count + 1;
                }
            }
        }

        var rules = new List<AprioriResult>();
        foreach (var ((a, b), pairCount) in pairCounts)
        {
            var support = (double)pairCount / totalTransactions;
            if (support < MinSupport) continue;

            var confidenceAtoB = (double)pairCount / productCounts[a];
            var confidenceBtoA = (double)pairCount / productCounts[b];

            var liftAtoB = confidenceAtoB / ((double)productCounts[b] / totalTransactions);
            var liftBtoA = confidenceBtoA / ((double)productCounts[a] / totalTransactions);

            if (confidenceAtoB >= MinConfidence && liftAtoB > 1.0)
                rules.Add(new AprioriResult
                {
                    SourceProductId = a,
                    RecommendedProductId = b,
                    Confidence = Math.Round(confidenceAtoB, 4),
                    Lift = Math.Round(liftAtoB, 4),
                });

            if (confidenceBtoA >= MinConfidence && liftBtoA > 1.0)
                rules.Add(new AprioriResult
                {
                    SourceProductId = b,
                    RecommendedProductId = a,
                    Confidence = Math.Round(confidenceBtoA, 4),
                    Lift = Math.Round(liftBtoA, 4),
                });
        }

        return rules
            .OrderByDescending(r => r.Confidence)
            .ThenByDescending(r => r.Lift)
            .ToList();
    }

    public async Task<List<FrequentItemset>> GenerateFrequentItemsetsAsync(CancellationToken cancellationToken = default)
    {
        var transactions = await LoadTransactionsAsync(cancellationToken);
        var totalTransactions = transactions.Count;
        if (totalTransactions == 0) return new List<FrequentItemset>();

        var productCounts = CountProductFrequency(transactions);
        var frequentProducts = GetFrequentItems(productCounts, totalTransactions);
        if (frequentProducts.Count < 2) return new List<FrequentItemset>();

        var itemsetCounts = new Dictionary<List<int>, int>();
        foreach (var t in transactions)
        {
            var items = t.Where(p => frequentProducts.Contains(p)).Distinct().OrderBy(x => x).ToList();
            for (int size = 2; size <= Math.Min(MaxItemsetSize, items.Count); size++)
            {
                foreach (var combo in GetCombinations(items.ToHashSet(), size))
                {
                    var key = combo;
                    itemsetCounts.TryGetValue(key, out var count);
                    itemsetCounts[key] = count + 1;
                }
            }
        }

        var results = new List<FrequentItemset>();
        foreach (var (itemset, count) in itemsetCounts)
        {
            var support = (double)count / totalTransactions;
            if (support < MinSupport) continue;

            var minItemTxnCount = itemset.Min(p => productCounts.TryGetValue(p, out var c) ? c : 0);
            var confidence = minItemTxnCount > 0 ? (double)count / minItemTxnCount : 0;

            var expectedSupport = itemset.Aggregate(1.0, (acc, p) =>
            {
                var itemTxnCount = productCounts.TryGetValue(p, out var c) ? c : 0;
                return acc * ((double)itemTxnCount / totalTransactions);
            });
            var lift = expectedSupport > 0 ? support / expectedSupport : 0;

            if (confidence < MinConfidence || lift <= 1.0) continue;

            results.Add(new FrequentItemset
            {
                ProductIds = itemset,
                Support = Math.Round(support, 4),
                Confidence = Math.Round(confidence, 4),
                Lift = Math.Round(lift, 4),
            });
        }

        return results
            .OrderByDescending(r => r.Lift)
            .ThenByDescending(r => r.Support)
            .ToList();
    }

    public async Task<List<HighUtilityItemsetResult>> GenerateHighUtilityItemsetsAsync(
        IEnumerable<FrequentItemset>? candidates = null,
        CancellationToken cancellationToken = default)
    {
        var utilityTransactions = await LoadUtilityTransactionsAsync(cancellationToken);
        if (utilityTransactions.Count == 0) return new List<HighUtilityItemsetResult>();

        var totalTransactions = utilityTransactions.Count;

        var itemUtilities = new Dictionary<int, decimal>();
        var itemTransactionCounts = new Dictionary<int, int>();
        var totalUtility = 0m;

        foreach (var transaction in utilityTransactions)
        {
            var transactionUtility = 0m;
            var seenProducts = new HashSet<int>();
            foreach (var item in transaction.Items)
            {
                var itemUtility = item.Quantity * item.UnitPrice;
                transactionUtility += itemUtility;
                totalUtility += itemUtility;

                itemUtilities.TryGetValue(item.ProductId, out var existing);
                itemUtilities[item.ProductId] = existing + itemUtility;

                if (seenProducts.Add(item.ProductId))
                {
                    itemTransactionCounts.TryGetValue(item.ProductId, out var tc);
                    itemTransactionCounts[item.ProductId] = tc + 1;
                }
            }
        }

        if (totalUtility == 0) return new List<HighUtilityItemsetResult>();

        var minUtilityThreshold = totalUtility * 0.02m;

        List<List<int>> candidateItemsets;
        if (candidates != null)
        {
            candidateItemsets = candidates.Select(c => c.ProductIds.OrderBy(x => x).ToList()).ToList();
        }
        else
        {
            var frequentItems = itemUtilities
                .Where(kv => kv.Value >= minUtilityThreshold && itemTransactionCounts[kv.Key] >= (int)(totalTransactions * MinSupport))
                .Select(kv => kv.Key)
                .OrderBy(x => x)
                .ToList();

            if (frequentItems.Count < 2) return new List<HighUtilityItemsetResult>();

            candidateItemsets = new List<List<int>>();
            for (int size = 2; size <= MaxItemsetSize; size++)
            {
                foreach (var combo in GetCombinations(frequentItems.ToHashSet(), size))
                {
                    candidateItemsets.Add(combo);
                }
            }
        }

        var results = new List<HighUtilityItemsetResult>();

        foreach (var candidate in candidateItemsets)
        {
            var candidateSet = candidate.ToHashSet();
            var utilitySum = 0m;
            var txnCount = 0;

            foreach (var transaction in utilityTransactions)
            {
                var txnProducts = transaction.Items.ToDictionary(x => x.ProductId);
                if (!candidateSet.All(p => txnProducts.ContainsKey(p))) continue;

                txnCount++;
                foreach (var productId in candidateSet)
                {
                    var item = txnProducts[productId];
                    utilitySum += item.Quantity * item.UnitPrice;
                }
            }

            if (utilitySum < minUtilityThreshold) continue;

            var support = (double)txnCount / totalTransactions;
            if (support < MinSupport) continue;

            var minItemTxnCount = candidate.Min(p =>
                itemTransactionCounts.TryGetValue(p, out var tc) ? tc : 0);
            var confidence = minItemTxnCount > 0 ? (double)txnCount / minItemTxnCount : 0;

            var expectedSupport = candidate.Aggregate(1.0, (acc, p) =>
            {
                var itemTxnCount = itemTransactionCounts.TryGetValue(p, out var tc) ? tc : 0;
                return acc * ((double)itemTxnCount / totalTransactions);
            });
            var lift = expectedSupport > 0 ? support / expectedSupport : 0;

            var avgUtility = txnCount > 0 ? (decimal)utilitySum / txnCount : 0m;
            var weightedUtility = avgUtility * (decimal)Math.Log2(txnCount + 1);

            if (weightedUtility < MinWeightedUtility) continue;

            results.Add(new HighUtilityItemsetResult
            {
                ProductIds = candidate,
                TotalUtility = utilitySum,
                WeightedUtility = Math.Round(weightedUtility, 0),
                TransactionCount = txnCount,
                Support = Math.Round(support, 4),
                Confidence = Math.Round(confidence, 4),
                Lift = Math.Round(lift, 4),
                SuggestedDiscountPercent = CalculateDiscountByWeightedUtility(weightedUtility),
            });
        }

        return results
            .OrderByDescending(r => r.WeightedUtility)
            .ToList();
    }

    private static Dictionary<int, int> CountProductFrequency(List<List<int>> transactions)
    {
        return transactions
            .SelectMany(t => t)
            .GroupBy(p => p)
            .ToDictionary(g => g.Key, g => g.Count());
    }

    private static HashSet<int> GetFrequentItems(Dictionary<int, int> productCounts, int totalTransactions)
    {
        return productCounts
            .Where(kv => (double)kv.Value / totalTransactions >= MinSupport)
            .Select(kv => kv.Key)
            .ToHashSet();
    }

    private static IEnumerable<List<int>> GetCombinations(HashSet<int> items, int size)
    {
        var sorted = items.OrderBy(x => x).ToList();
        return GetCombinationsRecursive(sorted, size, 0);
    }

    private static IEnumerable<List<int>> GetCombinationsRecursive(List<int> items, int size, int start)
    {
        if (size == 0)
        {
            yield return new List<int>();
            yield break;
        }

        for (int i = start; i <= items.Count - size; i++)
        {
            foreach (var rest in GetCombinationsRecursive(items, size - 1, i + 1))
            {
                var result = new List<int> { items[i] };
                result.AddRange(rest);
                yield return result;
            }
        }
    }

    private static decimal CalculateDiscountByWeightedUtility(decimal weightedUtility)
    {
        if (weightedUtility >= 2_000_000m) return 25m;
        if (weightedUtility >= 1_000_000m) return 20m;
        if (weightedUtility >= 700_000m) return 15m;
        if (weightedUtility >= 500_000m) return 10m;
        return 5m;
    }
}
