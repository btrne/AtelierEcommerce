using Atelier.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Application.Dashboard.Queries;

public class GetSearchKeywordsQuery : IRequest<List<GetSearchKeywordsQuery.SearchKeywordDto>>
{
    public int Days { get; set; } = 7;
    public int TopN { get; set; } = 5;

    public class SearchKeywordDto
    {
        public string Keyword { get; set; } = string.Empty;
        public int Count { get; set; }
    }
}

public class GetSearchKeywordsQueryHandler
    : IRequestHandler<GetSearchKeywordsQuery, List<GetSearchKeywordsQuery.SearchKeywordDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IDateTime _dateTime;

    public GetSearchKeywordsQueryHandler(IApplicationDbContext context, IDateTime dateTime)
    {
        _context = context;
        _dateTime = dateTime;
    }

    public async Task<List<GetSearchKeywordsQuery.SearchKeywordDto>> Handle(
        GetSearchKeywordsQuery request, CancellationToken cancellationToken)
    {
        var since = _dateTime.UtcNow.AddDays(-request.Days);

        var keywords = await _context.UserEvents
            .Where(e => e.EventType == "search" && e.CreatedAt >= since)
            .GroupBy(e => e.Data)
            .Select(g => new { Data = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .Take(request.TopN)
            .ToListAsync(cancellationToken);

        return keywords.Select(k => new GetSearchKeywordsQuery.SearchKeywordDto
        {
            Keyword = ExtractQuery(k.Data),
            Count = k.Count,
        }).ToList();
    }

    private static string ExtractQuery(string? data)
    {
        if (string.IsNullOrWhiteSpace(data)) return "(empty)";
        try
        {
            var parsed = System.Text.Json.JsonDocument.Parse(data);
            if (parsed.RootElement.TryGetProperty("query", out var queryProp))
                return queryProp.GetString() ?? "(empty)";
        }
        catch { }
        return data;
    }
}
