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
    public decimal OriginalTotalPrice { get; set; }
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
    private const decimal MinWeightedUtility = 1_000_000m;
    private const int MaxItemsetSize = 4;

    private sealed class ListOfIntComparer : IEqualityComparer<List<int>>
    {
        public bool Equals(List<int>? x, List<int>? y)
        {
            if (ReferenceEquals(x, y)) return true;
            if (x is null || y is null) return false;
            if (x.Count != y.Count) return false;
            for (int i = 0; i < x.Count; i++)
                if (x[i] != y[i]) return false;
            return true;
        }

        public int GetHashCode(List<int> obj)
        {
            var hash = new HashCode();
            foreach (var v in obj) hash.Add(v);
            return hash.ToHashCode();
        }
    }

    private static readonly ListOfIntComparer ItemsetComparer = new();

    public AprioriRecommender(IApplicationDbContext context)
    {
        _context = context;
    }

    private async Task<List<List<int>>> LoadTransactionsAsync(CancellationToken cancellationToken)
    {
        var rows = await _context.OrderItems
            .AsNoTracking()
            .Where(oi => oi.Order.OrderStatus == "Completed" && oi.ProductVariant != null)
            .Select(oi => new { oi.OrderId, oi.ProductVariant!.ProductId })
            .ToListAsync(cancellationToken);

        return rows
            .GroupBy(r => r.OrderId)
            .Select(g => g.Select(r => r.ProductId).Distinct().ToList())
            .ToList();
    }

    private async Task<List<(int OrderId, List<UtilityItem> Items)>> LoadUtilityTransactionsAsync(
        CancellationToken cancellationToken)
    {
        var orderItems = await _context.OrderItems
            .AsNoTracking()
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
                    .Select(pg =>
                    {
                        var totalQty = pg.Sum(x => x.Quantity);
                        return new UtilityItem(
                            pg.Key,
                            totalQty,
                            totalQty > 0 ? pg.Sum(x => x.Quantity * x.UnitPrice) / totalQty : 0m);
                    })
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

        var allFrequentItemsets = new List<List<int>>();
        var allFrequentSets = new HashSet<List<int>>(ItemsetComparer);

        var sortedFrequent = frequentProducts.OrderBy(x => x).ToList();
        var pairs = GetCombinations(sortedFrequent, 2).ToList();
        var frequent2 = CountAndFilterItemsets(transactions, pairs, totalTransactions, frequentProducts);
        allFrequentItemsets.AddRange(frequent2);
        allFrequentSets.UnionWith(frequent2);

        var currentLevel = frequent2;
        for (int size = 3; size <= MaxItemsetSize && currentLevel.Count > 0; size++)
        {
            var candidates = GenerateAprioriCandidates(currentLevel);
            if (candidates.Count == 0) break;
            candidates = PruneCandidates(candidates, allFrequentSets);
            if (candidates.Count == 0) break;

            var frequentK = CountAndFilterItemsets(transactions, candidates, totalTransactions, frequentProducts);
            allFrequentItemsets.AddRange(frequentK);
            allFrequentSets.UnionWith(frequentK);
            currentLevel = frequentK;
        }

        var results = new List<FrequentItemset>();
        foreach (var itemset in allFrequentItemsets)
        {
            var supportCount = CountSupport(transactions, itemset, frequentProducts);
            var support = (double)supportCount / totalTransactions;

            var minItemTxnCount = itemset.Min(p => productCounts.TryGetValue(p, out var c) ? c : 0);
            var confidence = minItemTxnCount > 0 ? (double)supportCount / minItemTxnCount : 0;

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
            var seenProducts = new HashSet<int>();
            foreach (var item in transaction.Items)
            {
                var itemUtility = item.Quantity * item.UnitPrice;
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

        var precomputedTxns = utilityTransactions
            .Select(t => (t.OrderId, Items: t.Items.ToDictionary(x => x.ProductId)))
            .ToList();

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
                var allCombos = GetCombinations(frequentItems, size).ToList();
                var highUtility = FilterByUtility(allCombos, precomputedTxns, minUtilityThreshold);
                candidateItemsets.AddRange(highUtility);
            }
        }

        var results = new List<HighUtilityItemsetResult>();

        var candidateProductIds = candidateItemsets
            .SelectMany(c => c).Distinct().ToList();

        var productPrices = await _context.ProductVariants
            .AsNoTracking()
            .Where(pv => pv.IsActive && candidateProductIds.Contains(pv.ProductId))
            .GroupBy(pv => pv.ProductId)
            .Select(g => new { ProductId = g.Key, Price = g.Average(pv => pv.Price) })
            .ToDictionaryAsync(x => x.ProductId, x => x.Price, cancellationToken);

        foreach (var candidate in candidateItemsets)
        {
            var utilitySum = 0m;
            var txnCount = 0;

            foreach (var transaction in precomputedTxns)
            {
                var comboUtility = 0m;
                var containsAll = true;

                foreach (var productId in candidate)
                {
                    if (!transaction.Items.TryGetValue(productId, out var item))
                    {
                        containsAll = false;
                        break;
                    }

                    comboUtility += item.Quantity * item.UnitPrice;
                }

                if (!containsAll) continue;

                txnCount++;
                utilitySum += comboUtility;
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

            var originalTotalPrice = candidate.Sum(p =>
                productPrices.TryGetValue(p, out var price) ? price : 0m);

            results.Add(new HighUtilityItemsetResult
            {
                ProductIds = candidate,
                TotalUtility = utilitySum,
                WeightedUtility = Math.Round(weightedUtility, 0),
                OriginalTotalPrice = originalTotalPrice,
                TransactionCount = txnCount,
                Support = Math.Round(support, 4),
                Confidence = Math.Round(confidence, 4),
                Lift = Math.Round(lift, 4),
                SuggestedDiscountPercent = CalculateDiscountByOriginalPrice(originalTotalPrice),
            });
        }

        return results
            .OrderByDescending(r => r.WeightedUtility)
            .ToList();
    }

    private static Dictionary<int, int> CountProductFrequency(List<List<int>> transactions)
    {
        var counts = new Dictionary<int, int>();
        foreach (var t in transactions)
            foreach (var p in t)
            {
                counts.TryGetValue(p, out var c);
                counts[p] = c + 1;
            }
        return counts;
    }

    private static HashSet<int> GetFrequentItems(Dictionary<int, int> productCounts, int totalTransactions)
    {
        return productCounts
            .Where(kv => (double)kv.Value / totalTransactions >= MinSupport)
            .Select(kv => kv.Key)
            .ToHashSet();
    }

    private static List<List<int>> GenerateAprioriCandidates(List<List<int>> frequentK)
    {
        var candidates = new List<List<int>>();
        for (int i = 0; i < frequentK.Count; i++)
        {
            for (int j = i + 1; j < frequentK.Count; j++)
            {
                var a = frequentK[i];
                var b = frequentK[j];
                if (a.Count < 2) continue;

                bool prefixMatch = true;
                for (int k = 0; k < a.Count - 1; k++)
                {
                    if (a[k] != b[k]) { prefixMatch = false; break; }
                }
                if (!prefixMatch) continue;

                var merged = new List<int>(a) { b[^1] };
                candidates.Add(merged);
            }
        }
        return candidates.Distinct(ItemsetComparer).ToList();
    }

    private static List<List<int>> PruneCandidates(
        List<List<int>> candidates, HashSet<List<int>> frequentK)
    {
        return candidates.Where(c =>
        {
            for (int i = 0; i < c.Count; i++)
            {
                var subset = new List<int>(c.Count - 1);
                for (int j = 0; j < c.Count; j++)
                    if (j != i) subset.Add(c[j]);
                if (!frequentK.Contains(subset)) return false;
            }
            return true;
        }).ToList();
    }

    private static List<List<int>> CountAndFilterItemsets(
        List<List<int>> transactions, List<List<int>> candidates,
        int totalTransactions, HashSet<int> frequentProducts)
    {
        var counts = new Dictionary<List<int>, int>(ItemsetComparer);
        foreach (var t in transactions)
        {
            var items = t.Where(p => frequentProducts.Contains(p))
                .Distinct().OrderBy(x => x).ToList();
            var itemSet = new HashSet<int>(items);
            foreach (var candidate in candidates)
            {
                if (candidate.All(itemSet.Contains))
                {
                    counts.TryGetValue(candidate, out var c);
                    counts[candidate] = c + 1;
                }
            }
        }
        return counts
            .Where(kv => (double)kv.Value / totalTransactions >= MinSupport)
            .Select(kv => kv.Key)
            .ToList();
    }

    private static int CountSupport(
        List<List<int>> transactions, List<int> itemset, HashSet<int> frequentProducts)
    {
        int count = 0;
        foreach (var t in transactions)
        {
            var items = t.Where(p => frequentProducts.Contains(p))
                .Distinct().OrderBy(x => x).ToList();
            if (itemset.All(items.Contains)) count++;
        }
        return count;
    }

    private static List<List<int>> FilterByUtility(
        List<List<int>> candidates,
        List<(int OrderId, Dictionary<int, UtilityItem> Items)> precomputedTxns,
        decimal minUtilityThreshold)
    {
        var frequent = new List<List<int>>();
        foreach (var candidate in candidates)
        {
            decimal utilitySum = 0;
            foreach (var txn in precomputedTxns)
            {
                decimal comboUtility = 0;
                var containsAll = true;
                foreach (var pid in candidate)
                {
                    if (!txn.Items.TryGetValue(pid, out var item))
                    {
                        containsAll = false;
                        break;
                    }
                    comboUtility += item.Quantity * item.UnitPrice;
                }
                if (!containsAll) continue;
                utilitySum += comboUtility;
                if (utilitySum >= minUtilityThreshold) break;
            }
            if (utilitySum >= minUtilityThreshold) frequent.Add(candidate);
        }
        return frequent;
    }

    private static IEnumerable<List<int>> GetCombinations(IReadOnlyList<int> items, int size)
    {
        return GetCombinationsRecursive(items, size, 0);
    }

    private static IEnumerable<List<int>> GetCombinationsRecursive(IReadOnlyList<int> items, int size, int start)
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

    private static decimal CalculateDiscountByOriginalPrice(decimal originalPrice)
    {
        if (originalPrice >= 50_000_000m) return 25m;
        if (originalPrice >= 10_000_000m) return 20m;
        if (originalPrice >= 5_000_000m)  return 15m;
        return 10m;
    }
}
