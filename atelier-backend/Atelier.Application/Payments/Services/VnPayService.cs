using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Web;
using Atelier.Domain.Entities;
using Microsoft.Extensions.Configuration;

namespace Atelier.Application.Payments.Services;

public class VnPayService : IVnPayService
{
    private readonly string _baseUrl;
    private readonly string _tmnCode;
    private readonly string _hashSecret;
    private readonly string _defaultReturnUrl;

    public VnPayService(IConfiguration configuration)
    {
        var section = configuration.GetSection("VnPay");
        _baseUrl = section["BaseUrl"]!;
        _tmnCode = section["TmnCode"]!;
        _hashSecret = section["HashSecret"]!;
        _defaultReturnUrl = section["ReturnUrl"]!;
    }

    public string CreatePaymentUrl(Order order, string? returnUrl = null)
    {
        var host = returnUrl ?? _defaultReturnUrl;

        var txnRef = $"{order.Id}_{DateTime.UtcNow:yyyyMMddHHmmss}";
        var amount = ((long)(order.TotalAmount * 100)).ToString();
        var createDate = DateTime.UtcNow.ToString("yyyyMMddHHmmss");

        var vnpParams = new SortedDictionary<string, string>
        {
            { "vnp_Version", "2.1.0" },
            { "vnp_Command", "pay" },
            { "vnp_TmnCode", _tmnCode },
            { "vnp_Amount", amount },
            { "vnp_CreateDate", createDate },
            { "vnp_CurrCode", "VND" },
            { "vnp_IpAddr", "127.0.0.1" },
            { "vnp_Locale", "vn" },
            { "vnp_OrderInfo", $"Thanh toan don hang {order.OrderCode}" },
            { "vnp_OrderType", "other" },
            { "vnp_ReturnUrl", host },
            { "vnp_TxnRef", txnRef },
        };

        var signData = BuildHashData(vnpParams);
        var secureHash = HmacSha512(_hashSecret, signData);

        return $"{_baseUrl}?{signData}&vnp_SecureHash={secureHash}";
    }

    public bool VerifyIpn(IDictionary<string, string> queryParams)
    {
        if (!queryParams.TryGetValue("vnp_SecureHash", out var secureHash))
            return false;

        var sorted = new SortedDictionary<string, string>(
            StringComparer.OrdinalIgnoreCase);
        foreach (var kvp in queryParams)
        {
            if (!kvp.Key.Equals("vnp_SecureHash", StringComparison.OrdinalIgnoreCase) &&
                !kvp.Key.Equals("vnp_SecureHashType", StringComparison.OrdinalIgnoreCase))
            {
                sorted[kvp.Key] = kvp.Value;
            }
        }

        var signData = BuildHashData(sorted);
        var computed = HmacSha512(_hashSecret, signData);

        return computed.Equals(secureHash, StringComparison.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Build hash data string per VNPay spec: key=value pairs sorted by key,
    /// values URL-encoded, joined by '&'.
    /// </summary>
    private static string BuildHashData(SortedDictionary<string, string> vnpParams)
    {
        var data = new StringBuilder();
        foreach (var kv in vnpParams)
        {
            if (!string.IsNullOrEmpty(kv.Value))
            {
                data.Append(HttpUtility.UrlEncode(kv.Key, Encoding.UTF8));
                data.Append("=");
                data.Append(HttpUtility.UrlEncode(kv.Value, Encoding.UTF8));
                data.Append("&");
            }
        }

        if (data.Length > 0)
            data.Length -= 1; // remove trailing '&'

        return Regex.Replace(
            data.ToString().Replace("%20", "+"),
            @"%[a-f0-9]{2}",
            m => m.Value.ToUpperInvariant()
        );
    }

    private static string HmacSha512(string key, string data)
    {
        var encoding = Encoding.UTF8;
        using var hmac = new HMACSHA512(encoding.GetBytes(key));
        var hash = hmac.ComputeHash(encoding.GetBytes(data));
        return BitConverter.ToString(hash).Replace("-", "").ToLower();
    }
}
