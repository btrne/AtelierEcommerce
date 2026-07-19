using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Atelier.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Atelier.Infrastructure.Services;

public class GeminiAiService : IAiService
{
    private readonly HttpClient _httpClient;
    private readonly GeminiOptions _options;
    private readonly IApplicationDbContext _context;

    public GeminiAiService(HttpClient httpClient, IOptions<GeminiOptions> options, IApplicationDbContext context)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _context = context;
    }

    public async Task<AiChatResult> ChatAsync(AiChatRequest request, CancellationToken ct)
    {
        var url = $"{_options.ApiUrl.TrimEnd('/')}/{_options.Model}:generateContent?key={_options.ApiKey}";
        var isLoggedIn = request.UserId.HasValue;

        var systemMessage = await BuildSystemPromptAsync(request.UserId, ct);
        var contents = BuildContents(request);
        var body = BuildRequestBody(systemMessage, contents);

        var productSuggestions = new List<AiProductSuggestion>();

        // Round 1: Send to Gemini
        var (replyText, functionCalls) = await CallGeminiAsync(url, body, ct);

        // Round 2+: Execute function calls and send back results
        var maxRounds = 5;
        var round = 0;
        while (functionCalls.Count > 0 && round < maxRounds)
        {
            round++;
            var functionResponses = new List<object>();
            foreach (var (name, args, _) in functionCalls)
            {
                var resultJson = await ExecuteFunctionAsync(name, args, productSuggestions, ct);
                using var fms = new MemoryStream();
                using var fw = new Utf8JsonWriter(fms);
                fw.WriteStartObject();
                fw.WriteStartObject("functionResponse");
                fw.WriteString("name", name);
                fw.WriteStartObject("response");
                fw.WriteString("name", name);
                fw.WritePropertyName("content");
                fw.WriteRawValue(resultJson);
                fw.WriteEndObject();
                fw.WriteEndObject();
                fw.WriteEndObject();
                fw.Flush();
                var fjson = Encoding.UTF8.GetString(fms.ToArray());
                using var fdoc = JsonDocument.Parse(fjson);
                functionResponses.Add(fdoc.RootElement.Clone());
            }

            // Add model's function call + user's function response to contents
            contents.Add(BuildModelFunctionCallContent(functionCalls));
            contents.Add(new
            {
                role = "function",
                parts = functionResponses.ToArray()
            });

            body = BuildRequestBody(systemMessage, contents);
            (replyText, functionCalls) = await CallGeminiAsync(url, body, ct);
        }

        // Parse inline product JSON from raw reply BEFORE parsing transfer JSON
        // (transfer JSON parsing may truncate the text, losing product suggestions)
        if (productSuggestions.Count == 0)
        {
            var jsonStart = replyText.IndexOf("{\"type\":\"product\"", StringComparison.Ordinal);
            if (jsonStart >= 0)
            {
                var jsonEnd = FindJsonEnd(replyText, jsonStart);
                if (jsonEnd >= 0)
                {
                    var jsonPart = replyText[jsonStart..(jsonEnd + 1)];
                    try
                    {
                        using var doc = JsonDocument.Parse(jsonPart);
                        var root = doc.RootElement;
                        if (root.GetProperty("type").GetString() == "product")
                        {
                            foreach (var p in root.GetProperty("products").EnumerateArray())
                            {
                                var productId = p.GetProperty("id").GetInt32();
                                var realImageUrl = await _context.ProductVariantImages
                                    .Where(vi => vi.ProductVariant.ProductId == productId)
                                    .OrderByDescending(vi => vi.ProductVariant.IsDefault)
                                    .ThenByDescending(vi => vi.IsPrimary == true)
                                    .Select(vi => vi.ImageUrl)
                                    .FirstOrDefaultAsync(ct);

                                productSuggestions.Add(new AiProductSuggestion
                                {
                                    Id = productId,
                                    Name = p.GetProperty("name").GetString() ?? "",
                                    Price = p.TryGetProperty("price_min", out var pm) ? pm.GetDecimal() : 0,
                                    PriceMin = p.TryGetProperty("price_min", out var pmin) ? pmin.GetDecimal() : 0,
                                    PriceMax = p.TryGetProperty("price_max", out var pmax) ? pmax.GetDecimal() : 0,
                                    ImageUrl = realImageUrl,
                                    Slug = p.TryGetProperty("slug", out var sl) ? sl.GetString() : null,
                                    CategoryName = p.TryGetProperty("category", out var cat) ? cat.GetString() : null,
                                });
                            }
                        }
                    }
                    catch { }
                }
            }
        }

        // Parse transfer JSON from final text
        var (finalReply, transferTo, transferReason) = ParseTransferJson(replyText);

        if (productSuggestions.Count > 0)
        {
            var now = DateTime.UtcNow;
            foreach (var s in productSuggestions)
            {
                _context.AiSuggestionLogs.Add(new Domain.Entities.AiSuggestionLog
                {
                    UserId = request.UserId,
                    UserQuery = request.Message,
                    AiMessage = finalReply,
                    ProductId = s.Id,
                    ProductName = s.Name,
                    ProductPrice = s.Price,
                    ProductImage = s.ImageUrl,
                    ProductSlug = s.Slug,
                    CategoryName = s.CategoryName,
                    SuggestedAt = now
                });
            }
            await _context.SaveChangesAsync(ct);
        }

        if (IsCasualMessage(request.Message))
        {
            productSuggestions.Clear();
        }

        return new AiChatResult
        {
            Reply = ApplyTextTemplate(finalReply),
            TransferTo = transferTo,
            TransferReason = transferReason,
            ProductSuggestions = productSuggestions.Count > 0 ? productSuggestions : null
        };
    }

    private static string ApplyTextTemplate(string text)
    {
        text = text.Replace("**", "").Replace("__", "");

        var jsonStart = text.IndexOf("\n{\"type\"", StringComparison.Ordinal);
        if (jsonStart < 0)
        {
            jsonStart = text.IndexOf("{\"type\"", StringComparison.Ordinal);
            if (jsonStart < 0) return text;
        }

        var jsonEnd = FindJsonEnd(text, jsonStart);
        if (jsonEnd < 0) return text;

        var jsonPart = text[jsonStart..(jsonEnd + 1)];
        var textPart = text[..jsonStart].TrimEnd();

        using var doc = JsonDocument.Parse(jsonPart);
        var root = doc.RootElement;

        return root.GetProperty("type").GetString() switch
        {
            "product" => textPart,
            "order_list" => RenderOrderList(root, textPart),
            "collection" => RenderCollection(root, textPart),
            _ => textPart
        };
    }

    private static int FindJsonEnd(string text, int start)
    {
        var depth = 0;
        var inString = false;
        for (var i = start; i < text.Length; i++)
        {
            if (text[i] == '\\') { i++; continue; }
            if (text[i] == '"') { inString = !inString; continue; }
            if (inString) continue;
            if (text[i] == '{') depth++;
            else if (text[i] == '}') { depth--; if (depth == 0) return i; }
        }
        return -1;
    }

    private static string RenderProduct(JsonElement root, string textPart)
    {
        var products = root.GetProperty("products");
        if (products.GetArrayLength() == 0)
            return textPart + "\n\nKhông tìm thấy sản phẩm phù hợp.";

        var sb = new StringBuilder();
        var hasText = !string.IsNullOrWhiteSpace(textPart);
        if (hasText)
        {
            sb.AppendLine(textPart);
            sb.AppendLine();
        }

        foreach (var p in products.EnumerateArray())
        {
            var name = p.GetProperty("name").GetString() ?? "";
            var category = p.TryGetProperty("category", out var cat) ? cat.GetString() ?? "" : "";
            var priceMin = p.GetProperty("price_min").GetDecimal();
            var priceMax = p.GetProperty("price_max").GetDecimal();
            var desc = p.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";

            sb.Append(name);
            if (!string.IsNullOrEmpty(category))
                sb.Append(" - ").Append(category);
            sb.AppendLine();

            if (priceMin == priceMax)
                sb.AppendLine($"Giá: {priceMin:N0}₫");
            else
                sb.AppendLine($"Giá: {priceMin:N0}₫ - {priceMax:N0}₫");

            if (!string.IsNullOrEmpty(desc))
                sb.AppendLine(desc);

            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private static string RenderOrderList(JsonElement root, string textPart)
    {
        var orders = root.GetProperty("orders");
        if (orders.GetArrayLength() == 0)
            return textPart + "\n\nKhông tìm thấy đơn hàng nào.";

        var sb = new StringBuilder();
        var hasText = !string.IsNullOrWhiteSpace(textPart);
        if (hasText)
        {
            sb.AppendLine(textPart);
            sb.AppendLine();
        }

        var index = 1;
        foreach (var o in orders.EnumerateArray())
        {
            var code = o.GetProperty("code").GetString() ?? "";
            var status = o.GetProperty("status").GetString() ?? "";
            var total = o.GetProperty("total").GetDecimal();
            var date = o.TryGetProperty("date", out var dt) ? dt.GetString() ?? "" : "";

            sb.AppendLine($"{index}. {code}");
            sb.AppendLine($"   Mã đơn: {code}");
            sb.AppendLine($"   Trạng thái: {status}");
            sb.AppendLine($"   Tổng tiền: {total:N0}₫");
            if (!string.IsNullOrEmpty(date))
                sb.AppendLine($"   Ngày đặt: {date}");
            sb.AppendLine();

            index++;
        }

        return sb.ToString().TrimEnd();
    }

    private static string RenderCollection(JsonElement root, string textPart)
    {
        var collections = root.GetProperty("collections");
        if (collections.GetArrayLength() == 0)
            return textPart + "\n\nKhông tìm thấy bộ sưu tập nào.";

        var sb = new StringBuilder();
        var hasText = !string.IsNullOrWhiteSpace(textPart);
        if (hasText)
        {
            sb.AppendLine(textPart);
            sb.AppendLine();
        }

        foreach (var c in collections.EnumerateArray())
        {
            var name = c.GetProperty("name").GetString() ?? "";
            var desc = c.TryGetProperty("description", out var d) ? d.GetString() ?? "" : "";
            var count = c.TryGetProperty("product_count", out var pc) ? pc.GetInt32() : 0;

            sb.AppendLine($"Bộ sưu tập: {name}");
            if (!string.IsNullOrEmpty(desc))
                sb.AppendLine(desc);
            if (count > 0)
                sb.AppendLine($"{count} sản phẩm");
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd();
    }

    private async Task<string> BuildSystemPromptAsync(int? userId, CancellationToken ct)
    {
        var products = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.IsFeatured)
            .ThenByDescending(p => p.CreatedAt)
            .ToListAsync(ct);

        var productLines = products.Select(p =>
        {
            var minPrice = p.ProductVariants.Any() ? p.ProductVariants.Min(v => v.Price) : 0;
            var maxPrice = p.ProductVariants.Any() ? p.ProductVariants.Max(v => v.Price) : 0;
            var priceStr = minPrice == maxPrice ? $"{minPrice:N0}₫" : $"{minPrice:N0} - {maxPrice:N0}₫";
            var slug = p.Slug ?? p.Name.ToLower().Replace(" ", "-");
            return $"- {p.Name} ({(p.Category?.Name ?? "Khác")}) - {priceStr} - slug: {slug}";
        });

        var catalogText = string.Join("\n", productLines);

        var categories = await _context.Categories
            .Where(c => c.IsActive)
            .Select(c => c.Name)
            .ToListAsync(ct);
        var categoryText = string.Join(", ", categories);

        var collections = await _context.Collections
            .Where(c => c.IsActive)
            .Select(c => c.Name)
            .ToListAsync(ct);
        var collectionText = string.Join(", ", collections);

        var isLoggedIn = userId.HasValue;

        var prompt =
            "Bạn là trợ lý Atelier, chuyên về thời trang da thủ công cao cấp.\n" +
            "Bạn có thể trả lời các câu hỏi về sản phẩm, đơn hàng, chính sách của Atelier.\n\n" +
            "THÔNG TIN NGƯỜI DÙNG:\n" +
            $"- Đã đăng nhập: {(isLoggedIn ? "Có" : "Không")}\n";

        if (isLoggedIn)
        {
            var recentOrders = await _context.Orders
                .Where(o => o.UserId == userId)
                .OrderByDescending(o => o.CreatedAt)
                .Take(3)
                .Select(o => $"{o.OrderCode} ({o.OrderStatus}) - {o.TotalAmount:N0}₫")
                .ToListAsync(ct);

            if (recentOrders.Count > 0)
                prompt += $"- Đơn hàng gần đây: {string.Join("; ", recentOrders)}\n";

            var wishlistCount = await _context.Wishlists
                .CountAsync(w => w.UserId == userId, ct);

            prompt += $"- Sản phẩm yêu thích: {wishlistCount} sản phẩm\n";

            var ownCartItems = await _context.CartItems
                .Where(ci => ci.Cart.UserId == userId)
                .Select(ci => ci.ProductVariant.Product.Name)
                .Distinct()
                .Take(5)
                .ToListAsync(ct);

            if (ownCartItems.Count > 0)
                prompt += $"- Giỏ hàng hiện tại: {string.Join(", ", ownCartItems)}\n";
        }

        prompt +=
            $"\nDANH MỤC SẢN PHẨM: {categoryText}\n\n" +
            $"BỘ SƯU TẬP: {collectionText}\n\n" +
            "DANH SÁCH SẢN PHẨM HIỆN CÓ:\n" +
            $"{catalogText}\n\n" +
            "QUY TẮC:\n" +
            "1. Nếu khách hỏi về đơn hàng, hãy yêu cầu cung cấp mã đơn hàng, sau đó gọi hàm getOrderStatus.\n" +
            "2. Nếu khách muốn khiếu nại hoặc nói chuyện với người thật, trả lời: {\"transferTo\":\"Support\",\"transferReason\":\"...\"}\n" +
            "3. Nếu khách muốn đặt chế tác riêng, hãy tư vấn cơ bản; nếu khách đồng ý, hãy trả lời với thông tin tư vấn và kèm JSON: {\"transferTo\":\"Consulting\",\"transferReason\":\"...\"}\n" +
            "4. Luôn trả lời bằng tiếng Việt, lịch sự, chuyên nghiệp.\n" +
            "5. Chỉ trả lời các chủ đề liên quan Atelier.\n" +
            "6. Nếu khách CHƯA đăng nhập, KHÔNG gợi ý chuyển tiếp - thay vào đó khuyến khích họ đăng ký/đăng nhập để được hỗ trợ.\n" +
            "7. Nếu khách ĐÃ đăng nhập, không cần hỏi lại việc đăng nhập, chuyển tiếp ngay nếu khách đồng ý.\n" +
            "8. KHI KHÁCH CHỈ NÓI LỜI CẢM ƠN (cảm ơn, thank, cám ơn,thanks...), CHÀO HỎI (xin chào, hello, hi, chào bạn...), hoặc TRÒ CHUYỆN XÃ GIAO KHÔNG LIÊN QUAN SẢN PHẨM:\n" +
            "   - KHÔNG gọi bất kỳ hàm nào (searchProducts, getProductInfo, getOrderStatus).\n" +
            "   - Chỉ trả lời xã giao ngắn gọn, lịch sự, thân thiện.\n" +
            "   - KHÔNG gợi ý hay giới thiệu sản phẩm.\n" +
            "9. CHỈ gọi searchProducts/getProductInfo KHI khách hỏi cụ thể về sản phẩm, muốn xem sản phẩm, so sánh sản phẩm, hoặc câu hỏi liên quan trực tiếp đến việc mua hàng.\n" +
            "10. MÀU SẮC, CHẤT LIỆU, KÍCH THƯỚC, HOẶC BẤT KỲ THUỘC TÍNH NÀO CỦA SẢN PHẨM:\n" +
            "   - BẮT BUỘC phải gọi searchProducts hoặc getProductInfo để lấy thông tin từ hệ thống.\n" +
            "   - KHÔNG BAO GIỜ trả lời về màu sắc, chất liệu, thuộc tính dựa trên kiến thức riêng.\n" +
            "   - Danh sách sản phẩm trong prompt CHỈ chứa tên, danh mục và giá - KHÔNG chứa thông tin màu sắc hay thuộc tính.\n" +
            "11. KHI KHÁCH HỎI VỀ SẢN PHẨM THUỘC MỘT DANH MỤC CỤ THỂ (ví dụ 'túi đeo chéo', 'túi tote', 'túi xách tay'), LUÔN gọi hàm searchProducts với tham số categoryName tương ứng. KHÔNG tự kết luận 'không có' hay 'hết hàng' dựa trên danh sách sản phẩm trong prompt.\n" +
            "12. KHI GIỚI THIỆU SẢN PHẨM: Luôn gọi hàm searchProducts hoặc getProductInfo để lấy thông tin thật từ kho hàng. KHÔNG tự ý bịa thông tin sản phẩm.\n" +
            "   Khi khách yêu cầu sản phẩm theo khoảng giá (ví dụ 'trên 1 triệu', 'dưới 500k', 'từ 2 đến 5 triệu'), hãy truyền tham số minPrice/maxPrice vào searchProducts.\n" +
            "   Lưu ý: đơn vị giá là VND, 1 triệu = 1000000.\n" +
            "13. SAU KHI GỌI searchProducts / getProductInfo / getOrderStatus:\n" +
            "   Chỉ trả lời xã giao tối thiểu (chào, hỏi, cảm ơn, xác nhận).\n" +
            "   KHÔNG liệt kê hay mô tả thông tin sản phẩm/đơn hàng trong text.\n" +
            "   Đặt JSON ở dòng cuối cùng.\n" +
            "14. MẪU JSON SẢN PHẨM (đặt ngay sau text):\n" +
            "{\"type\":\"product\",\"products\":[{\"id\":1,\"name\":\"...\",\"category\":\"...\",\"price_min\":0,\"price_max\":0,\"description\":\"...\",\"image\":\"...\",\"slug\":\"...\",\"attributes\":[{\"attribute\":\"Màu sắc\",\"value\":\"Nâu\"}]}]}\n" +
            "15. MẪU JSON ĐƠN HÀNG (đặt ngay sau text):\n" +
            "{\"type\":\"order_list\",\"orders\":[{\"code\":\"...\",\"status\":\"...\",\"total\":0,\"date\":\"...\"}]}\n" +
            "16. MẪU JSON BỘ SƯU TẬP (đặt ngay sau text):\n" +
            "{\"type\":\"collection\",\"collections\":[{\"name\":\"...\",\"description\":\"...\",\"product_count\":0}]}";

        return prompt;
    }

    private static List<object> BuildContents(AiChatRequest request)
    {
        var contents = new List<object>();

        if (request.History != null)
        {
            foreach (var item in request.History)
            {
                contents.Add(new
                {
                    role = item.Role == "assistant" ? "model" : "user",
                    parts = new[] { new { text = item.Text } }
                });
            }
        }

        contents.Add(new
        {
            role = "user",
            parts = new[] { new { text = request.Message } }
        });

        return contents;
    }

    private static object BuildRequestBody(string systemMessage, List<object> contents)
    {
        return new
        {
            system_instruction = new
            {
                parts = new[] { new { text = systemMessage } }
            },
            contents,
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens = 1024
            },
            tools = new[]
            {
                new
                {
                    functionDeclarations = new[]
                    {
                        new
                        {
                            name = "getOrderStatus",
                            description = "Lấy trạng thái đơn hàng theo mã đơn",
                            parameters = new
                            {
                                type = "object",
                                properties = new Dictionary<string, object>
                                {
                                    ["orderCode"] = new { type = "string", description = "Mã đơn hàng" }
                                },
                                required = new List<string> { "orderCode" }
                            }
                        },
                        new
                        {
                            name = "getProductInfo",
                            description = "Lấy thông tin chi tiết một sản phẩm theo tên. Trả về màu sắc, chất liệu, thuộc tính sản phẩm.",
                            parameters = new
                            {
                                type = "object",
                                properties = new Dictionary<string, object>
                                {
                                    ["productName"] = new { type = "string", description = "Tên sản phẩm cần tìm" }
                                },
                                required = new List<string> { "productName" }
                            }
                        },
                        new
                        {
                            name = "searchProducts",
                            description = "Tìm kiếm sản phẩm trong kho Atelier theo từ khóa, danh mục, bộ sưu tập hoặc khoảng giá. Trả về thông tin chi tiết bao gồm màu sắc, chất liệu và thuộc tính sản phẩm.",
                            parameters = new
                            {
                                type = "object",
                                properties = new Dictionary<string, object>
                                {
                                    ["query"] = new { type = "string", description = "Từ khóa tìm kiếm (tên sản phẩm)" },
                                    ["categoryName"] = new { type = "string", description = "Lọc theo tên danh mục (không bắt buộc)" },
                                    ["collectionName"] = new { type = "string", description = "Lọc theo tên bộ sưu tập (không bắt buộc)" },
                                    ["minPrice"] = new { type = "number", description = "Giá tối thiểu (không bắt buộc)" },
                                    ["maxPrice"] = new { type = "number", description = "Giá tối đa (không bắt buộc)" }
                                },
                                required = new List<string> { "query" }
                            }
                        }
                    }
                }
            }
        };
    }

    private static object BuildModelFunctionCallContent(
        List<(string Name, string Args, string? ThoughtSignature)> functionCalls)
    {
        using var ms = new MemoryStream();
        using var writer = new Utf8JsonWriter(ms);

        writer.WriteStartObject();
        writer.WriteString("role", "model");
        writer.WriteStartArray("parts");

        foreach (var fc in functionCalls)
        {
            writer.WriteStartObject();
            writer.WriteStartObject("functionCall");
            writer.WriteString("name", fc.Name);
            writer.WritePropertyName("args");
            writer.WriteRawValue(fc.Args);
            writer.WriteEndObject(); // end functionCall
            if (fc.ThoughtSignature != null)
                writer.WriteString("thought_signature", fc.ThoughtSignature);
            writer.WriteEndObject(); // end part
        }

        writer.WriteEndArray();
        writer.WriteEndObject();
        writer.Flush();

        var json = Encoding.UTF8.GetString(ms.ToArray());
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.Clone();
    }

    private async Task<(string Text, List<(string Name, string Args, string? ThoughtSignature)> FunctionCalls)> CallGeminiAsync(
        string url, object body, CancellationToken ct)
    {
        var jsonBody = JsonSerializer.Serialize(body, new JsonSerializerOptions { WriteIndented = true });
        Console.WriteLine("=== GEMINI REQUEST BODY ===");
        Console.WriteLine(jsonBody);
        Console.WriteLine("===========================");

        var response = await _httpClient.PostAsJsonAsync(url, body, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new Exception($"Gemini API error ({response.StatusCode}): {errorBody}");
        }

        var json = await response.Content.ReadAsStringAsync(ct);
        Console.WriteLine("=== GEMINI RESPONSE ===");
        Console.WriteLine(json);
        Console.WriteLine("========================");

        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var candidate = root.GetProperty("candidates")[0];
        var content = candidate.GetProperty("content");
        var parts = content.GetProperty("parts");

        var text = "";
        var functionCalls = new List<(string Name, string Args, string? ThoughtSignature)>();
        string? partThoughtSignature = null;

        foreach (var part in parts.EnumerateArray())
        {
            // Gemini returns thoughtSignature (camelCase) at part level
            if (part.TryGetProperty("thoughtSignature", out var ts))
                partThoughtSignature = ts.GetString();

            if (part.TryGetProperty("text", out var textEl))
            {
                text = textEl.GetString() ?? "";
            }

            if (part.TryGetProperty("functionCall", out var fc))
            {
                var name = fc.GetProperty("name").GetString()!;
                var args = fc.GetProperty("args").GetRawText();
                var thoughtSignature = partThoughtSignature
                    ?? (fc.TryGetProperty("thoughtSignature", out var ts2) ? ts2.GetString() : null)
                    ?? (fc.TryGetProperty("thought_signature", out var ts3) ? ts3.GetString() : null);
                functionCalls.Add((name, args, thoughtSignature));
                partThoughtSignature = null;
            }
        }

        return (text, functionCalls);
    }

    private async Task<string> ExecuteFunctionAsync(string name, string argsJson, List<AiProductSuggestion> suggestions, CancellationToken ct)
    {
        using var argsDoc = JsonDocument.Parse(argsJson);
        var args = argsDoc.RootElement;

        return name switch
        {
            "getOrderStatus" => await GetOrderStatusAsync(
                args.GetProperty("orderCode").GetString()!, ct),
            "getProductInfo" => await GetProductInfoAsync(
                args.GetProperty("productName").GetString()!, suggestions, ct),
            "searchProducts" => await SearchProductsAsync(args, suggestions, ct),
            _ => "{}"
        };
    }

    private async Task<string> GetOrderStatusAsync(string orderCode, CancellationToken ct)
    {
        var order = await _context.Orders
            .Where(o => o.OrderCode == orderCode)
            .Select(o => new
            {
                o.OrderCode,
                o.OrderStatus,
                o.TotalAmount,
                o.CreatedAt,
                o.ShippingContactName,
                o.ShippingPhone,
                o.ShippingProvince
            })
            .FirstOrDefaultAsync(ct);

        if (order == null)
            return JsonSerializer.Serialize(new { error = $"Không tìm thấy đơn hàng mã {orderCode}" });

        return JsonSerializer.Serialize(order);
    }

    private async Task<string> GetProductInfoAsync(string productName, List<AiProductSuggestion> suggestions, CancellationToken ct)
    {
        var product = await _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.VariantAttributes)
                    .ThenInclude(va => va.AttributeOption)
                        .ThenInclude(ao => ao.Attribute)
            .Where(p => p.IsActive && p.Name.Contains(productName))
            .FirstOrDefaultAsync(ct);

        if (product == null)
            return JsonSerializer.Serialize(new { error = $"Không tìm thấy sản phẩm '{productName}'" });

        var minPrice = product.ProductVariants.Any() ? product.ProductVariants.Min(v => v.Price) : 0;
        var maxPrice = product.ProductVariants.Any() ? product.ProductVariants.Max(v => v.Price) : 0;
        var imageUrl = await _context.ProductVariantImages
            .Where(vi => vi.ProductVariant.ProductId == product.Id)
            .OrderByDescending(vi => vi.ProductVariant.IsDefault)
            .ThenByDescending(vi => vi.IsPrimary == true)
            .Select(vi => vi.ImageUrl)
            .FirstOrDefaultAsync(ct);

        suggestions.Add(new AiProductSuggestion
        {
            Id = product.Id,
            Name = product.Name ?? "",
            Description = product.ShortDescription,
            Price = minPrice,
            PriceMin = minPrice,
            PriceMax = maxPrice,
            ImageUrl = imageUrl,
            Slug = product.Slug,
            CategoryName = product.Category?.Name
        });

        return JsonSerializer.Serialize(new
        {
            id = product.Id,
            name = product.Name,
            category = product.Category?.Name,
            description = product.ShortDescription,
            minPrice,
            maxPrice,
            imageUrl,
            slug = product.Slug,
            isInStock = product.ProductVariants.Any(v => v.Quantity > 0),
            attributes = product.ProductVariants
                .SelectMany(v => v.VariantAttributes)
                .Where(va => va.AttributeOption?.Attribute != null)
                .Select(va => new { attribute = va.AttributeOption.Attribute!.Name, value = va.AttributeOption.Value })
                .Distinct()
                .ToList()
        });
    }

    private async Task<string> SearchProductsAsync(JsonElement args, List<AiProductSuggestion> suggestions, CancellationToken ct)
    {
        var query = args.GetProperty("query").GetString() ?? "";
        var categoryName = args.TryGetProperty("categoryName", out var cn) ? cn.GetString() : null;
        var collectionName = args.TryGetProperty("collectionName", out var cnEl) ? cnEl.GetString() : null;
        double? filterMinPrice = args.TryGetProperty("minPrice", out var minP) ? minP.GetDouble() : null;
        double? filterMaxPrice = args.TryGetProperty("maxPrice", out var maxP) ? maxP.GetDouble() : null;

        var q = _context.Products
            .Include(p => p.Category)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.ProductVariantImages)
            .Include(p => p.ProductVariants)
                .ThenInclude(v => v.VariantAttributes)
                    .ThenInclude(va => va.AttributeOption)
                        .ThenInclude(ao => ao.Attribute)
            .Include(p => p.ProductCollections)
                .ThenInclude(pc => pc.Collection)
            .Where(p => p.IsActive)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var search = query.ToLower();
            q = q.Where(p =>
                (p.Name != null && p.Name.ToLower().Contains(search)) ||
                (p.ShortDescription != null && p.ShortDescription.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(categoryName))
        {
            var cat = categoryName.ToLower();
            q = q.Where(p => p.Category != null && p.Category.Name.ToLower().Contains(cat));
        }

        if (!string.IsNullOrWhiteSpace(collectionName))
        {
            var colName = collectionName.ToLower();
            q = q.Where(p => p.ProductCollections.Any(pc => pc.Collection.Name.ToLower().Contains(colName)));
        }

        if (filterMinPrice.HasValue)
            q = q.Where(p => p.ProductVariants.Any(v => v.Price >= (decimal)filterMinPrice.Value));

        if (filterMaxPrice.HasValue)
            q = q.Where(p => p.ProductVariants.Any(v => v.Price <= (decimal)filterMaxPrice.Value));

        var products = await q.Take(10).ToListAsync(ct);

        var resultList = new List<object>();
        foreach (var product in products)
        {
            var minPrice = product.ProductVariants.Any() ? product.ProductVariants.Min(v => v.Price) : 0;
            var maxPrice = product.ProductVariants.Any() ? product.ProductVariants.Max(v => v.Price) : 0;
            var imageUrl = await _context.ProductVariantImages
                .Where(vi => vi.ProductVariant.ProductId == product.Id)
                .OrderByDescending(vi => vi.ProductVariant.IsDefault)
                .ThenByDescending(vi => vi.IsPrimary == true)
                .Select(vi => vi.ImageUrl)
                .FirstOrDefaultAsync(ct);

            suggestions.Add(new AiProductSuggestion
            {
                Id = product.Id,
                Name = product.Name ?? "",
                Description = product.ShortDescription,
                Price = minPrice,
                PriceMin = minPrice,
                PriceMax = maxPrice,
                ImageUrl = imageUrl,
                Slug = product.Slug,
                CategoryName = product.Category?.Name
            });

            resultList.Add(new
            {
                id = product.Id,
                name = product.Name,
                category = product.Category?.Name,
                description = product.ShortDescription,
                minPrice,
                maxPrice,
                imageUrl,
                slug = product.Slug,
                isInStock = product.ProductVariants.Any(v => v.Quantity > 0),
                collections = product.ProductCollections.Select(pc => pc.Collection.Name).ToList(),
                attributes = product.ProductVariants
                    .SelectMany(v => v.VariantAttributes)
                    .Where(va => va.AttributeOption?.Attribute != null)
                    .Select(va => new { attribute = va.AttributeOption.Attribute!.Name, value = va.AttributeOption.Value })
                    .Distinct()
                    .ToList()
            });
        }

        return JsonSerializer.Serialize(new { products = resultList });
    }

    private static (string Text, string? TransferTo, string? TransferReason) ParseTransferJson(string text)
    {
        string? transferTo = null;
        string? transferReason = null;

        var transferJsonStart = text.IndexOf("{\"transferTo\"", StringComparison.Ordinal);
        if (transferJsonStart >= 0)
        {
            var jsonPart = text[transferJsonStart..];
            var closeBrace = jsonPart.LastIndexOf('}');
            if (closeBrace >= 0)
            {
                jsonPart = jsonPart[..(closeBrace + 1)];
                text = text[..transferJsonStart].TrimEnd();
                try
                {
                    using var replyDoc = JsonDocument.Parse(jsonPart);
                    if (replyDoc.RootElement.TryGetProperty("transferTo", out var t))
                    {
                        transferTo = t.GetString();
                        transferReason = replyDoc.RootElement.TryGetProperty("transferReason", out var r)
                            ? r.GetString()
                            : null;
                    }
                }
                catch { }
            }
        }

        return (text, transferTo, transferReason);
    }

    private static bool IsCasualMessage(string message)
    {
        var text = message.Trim().ToLowerInvariant();
        var patterns = new[]
        {
            "cảm ơn", "cam on", "cám ơn", "thank", "thanks", "cám ơn nhiều",
            "xin chào", "chào", "hello", "hi", "hey", "chào bạn", "chào anh", "chào chị",
            "tạm biệt", "bye", "goodbye", "tks", "ok", "okie",
            "👍", "🙏", "❤️",
            "vâng", "dạ", "ừ", "oke",
        };
        foreach (var p in patterns)
        {
            if (text == p || text.StartsWith(p + " ") || text.EndsWith(" " + p) || text.Contains(p + " ") || text.Contains(" " + p))
                return true;
        }
        if (text.Length <= 3) return true;
        return false;
    }
}
