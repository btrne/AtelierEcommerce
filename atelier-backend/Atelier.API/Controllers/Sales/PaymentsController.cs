using Atelier.Application.Common.Interfaces;
using Atelier.Application.Payments.Services;
using Atelier.Domain.Entities;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Atelier.Api.Controllers.Sales;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private const int VnPayTxnRefTimestampLength = 14;
    private const int VnPayPaymentMethodId = 2;

    private readonly IMediator _mediator;
    private readonly IApplicationDbContext _context;
    private readonly IVnPayService _vnPayService;
    private readonly IConfiguration _configuration;

    public PaymentsController(
        IMediator mediator,
        IApplicationDbContext context,
        IVnPayService vnPayService,
        IConfiguration configuration)
    {
        _mediator = mediator;
        _context = context;
        _vnPayService = vnPayService;
        _configuration = configuration;
    }

    [HttpGet("vnpay-return")]
    public async Task<IActionResult> VnPayReturn(CancellationToken cancellationToken)
    {
        var queryParams = HttpContext.Request.Query
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToString());

        if (!_vnPayService.VerifyIpn(queryParams))
            return RedirectToPayment(null, "fail", message: "Invalid payment signature.");

        if (!TryGetVnPayOrderId(queryParams, out var orderId))
            return RedirectToPayment(null, "fail", message: "Invalid payment reference.");

        if (!TryGetVnPayAmount(queryParams, out var vnpayAmount))
            return RedirectToPayment(orderId, "fail", message: "Invalid payment amount.");

        var responseCode = queryParams.GetValueOrDefault("vnp_ResponseCode");
        var transactionStatus = queryParams.GetValueOrDefault("vnp_TransactionStatus");
        var transactionNo = queryParams.GetValueOrDefault("vnp_TransactionNo");

        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
            return RedirectToPayment(null, "fail", message: "Order was not found.");

        var payment = GetVnPayPayment(order);
        if (payment == null)
            return RedirectToPayment(orderId, "fail", message: "Payment was not found.");

        if (!AmountsMatch(vnpayAmount, payment.Amount))
        {
            await MarkPaymentFailedAsync(payment, transactionNo, cancellationToken);
            return RedirectToPayment(orderId, "fail", transactionNo, "Payment amount mismatch.");
        }

        var isSuccess = IsVnPaySuccess(responseCode, transactionStatus);
        if (isSuccess)
            await MarkPaymentCompletedAsync(order, payment, transactionNo, cancellationToken);
        else
            await MarkPaymentFailedAsync(payment, transactionNo, cancellationToken);

        return RedirectToPayment(orderId, isSuccess ? "success" : "fail", transactionNo);
    }

    [HttpGet("vnpay-ipn")]
    public async Task<IActionResult> VnPayIpn(CancellationToken cancellationToken)
    {
        var queryParams = HttpContext.Request.Query
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToString());

        if (!_vnPayService.VerifyIpn(queryParams))
            return Ok(new { RspCode = "97", Message = "Invalid Signature" });

        if (!TryGetVnPayOrderId(queryParams, out var orderId))
            return Ok(new { RspCode = "01", Message = "Order Not Found" });

        if (!TryGetVnPayAmount(queryParams, out var vnpayAmount))
            return Ok(new { RspCode = "04", Message = "Invalid Amount" });

        var responseCode = queryParams.GetValueOrDefault("vnp_ResponseCode");
        var transactionStatus = queryParams.GetValueOrDefault("vnp_TransactionStatus");
        var transactionNo = queryParams.GetValueOrDefault("vnp_TransactionNo");

        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId, cancellationToken);

        if (order == null)
            return Ok(new { RspCode = "01", Message = "Order Not Found" });

        var payment = GetVnPayPayment(order);
        if (payment == null)
            return Ok(new { RspCode = "01", Message = "Payment Not Found" });

        if (payment.Status == "Completed")
            return Ok(new { RspCode = "02", Message = "Order Already Confirmed" });

        if (!AmountsMatch(vnpayAmount, payment.Amount))
        {
            await MarkPaymentFailedAsync(payment, transactionNo, cancellationToken);
            return Ok(new { RspCode = "04", Message = "Amount Mismatch" });
        }

        if (IsVnPaySuccess(responseCode, transactionStatus))
            await MarkPaymentCompletedAsync(order, payment, transactionNo, cancellationToken);
        else
            await MarkPaymentFailedAsync(payment, transactionNo, cancellationToken);

        return Ok(new { RspCode = "00", Message = "Confirm Success" });
    }

    [Authorize(Roles = "Admin")]
    [HttpGet("admin")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new Atelier.Application.Payments.Queries.GetAllPaymentsQuery
        {
            Page = page,
            PageSize = pageSize,
        });
        return Ok(result);
    }

    private IActionResult RedirectToPayment(int? orderId, string status, string? transactionNo = null, string? message = null)
    {
        var frontendBaseUrl = (_configuration["Frontend:BaseUrl"] ?? "/").TrimEnd('/');
        var query = new List<string> { $"status={Uri.EscapeDataString(status)}" };

        if (orderId.HasValue)
            query.Add($"orderId={orderId.Value}");
        if (!string.IsNullOrWhiteSpace(transactionNo))
            query.Add($"transactionNo={Uri.EscapeDataString(transactionNo)}");
        if (!string.IsNullOrWhiteSpace(message))
            query.Add($"message={Uri.EscapeDataString(message)}");

        return Redirect($"{frontendBaseUrl}/payment?{string.Join("&", query)}");
    }

    private static Payment? GetVnPayPayment(Order order)
    {
        return order.Payments
            .OrderByDescending(p => p.Id)
            .FirstOrDefault(p => p.PaymentMethodId == VnPayPaymentMethodId);
    }

    private static bool TryGetVnPayOrderId(IDictionary<string, string> queryParams, out int orderId)
    {
        orderId = 0;
        if (!queryParams.TryGetValue("vnp_TxnRef", out var txnRef) ||
            txnRef.Length <= VnPayTxnRefTimestampLength)
        {
            return false;
        }

        var orderIdPart = txnRef[..^VnPayTxnRefTimestampLength];
        return int.TryParse(orderIdPart, out orderId) && orderId > 0;
    }

    private static bool TryGetVnPayAmount(IDictionary<string, string> queryParams, out decimal amount)
    {
        amount = 0;
        if (!queryParams.TryGetValue("vnp_Amount", out var rawAmount) ||
            !long.TryParse(rawAmount, out var amountInSmallestUnit) ||
            amountInSmallestUnit < 0)
        {
            return false;
        }

        amount = amountInSmallestUnit / 100m;
        return true;
    }

    private static bool AmountsMatch(decimal vnpayAmount, decimal paymentAmount)
    {
        return decimal.Round(vnpayAmount, 0, MidpointRounding.AwayFromZero) ==
               decimal.Round(paymentAmount, 0, MidpointRounding.AwayFromZero);
    }

    private static bool IsVnPaySuccess(string? responseCode, string? transactionStatus)
    {
        return responseCode == "00" &&
               (string.IsNullOrWhiteSpace(transactionStatus) || transactionStatus == "00");
    }

    private async Task MarkPaymentCompletedAsync(
        Order order,
        Payment payment,
        string? transactionNo,
        CancellationToken cancellationToken)
    {
        if (payment.Status == "Completed")
            return;

        payment.TransactionCode = transactionNo;
        payment.Status = "Completed";
        payment.PaidAt ??= DateTime.UtcNow;

        if (order.OrderStatus != "Confirmed")
        {
            order.OrderLogs.Add(new OrderLog
            {
                FromStatus = order.OrderStatus,
                ToStatus = "Confirmed",
                Note = "VNPay payment completed",
                CreatedAt = DateTime.UtcNow,
            });
            order.OrderStatus = "Confirmed";
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task MarkPaymentFailedAsync(
        Payment payment,
        string? transactionNo,
        CancellationToken cancellationToken)
    {
        if (payment.Status == "Completed")
            return;

        payment.TransactionCode = transactionNo;
        payment.Status = "Failed";

        await _context.SaveChangesAsync(cancellationToken);
    }
}
