using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;
using Atelier.Application.Payments.Services;
using Atelier.Domain.Entities;

namespace Atelier.Api.Controllers.Sales;

[ApiController]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
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
    public async Task<IActionResult> VnPayReturn()
    {
        var queryParams = HttpContext.Request.Query
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToString());

        var isValid = _vnPayService.VerifyIpn(queryParams);

        if (!isValid)
        {
            return Redirect($"{_configuration["Frontend:BaseUrl"]}/payment?status=fail&message=Ch%E1%BB%AF+k%C3%BD+kh%C3%B4ng+h%E1%BB%A3p+l%E1%BB%87");
        }

        var txnRef = queryParams.GetValueOrDefault("vnp_TxnRef");
        var orderId = int.Parse(txnRef?.Split('_')[0] ?? "0");
        var responseCode = queryParams.GetValueOrDefault("vnp_ResponseCode");
        var transactionNo = queryParams.GetValueOrDefault("vnp_TransactionNo");

        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            return Redirect($"{_configuration["Frontend:BaseUrl"]}/payment?status=fail&message=Kh%C3%B4ng+t%C3%ACm+th%E1%BA%A5y+%C4%91%C6%A1n+h%C3%A0ng");
        }

        var payment = order.Payments.FirstOrDefault();
        if (payment != null)
        {
            payment.TransactionCode = transactionNo;

            if (responseCode == "00")
            {
                payment.Status = "Completed";
                payment.PaidAt = DateTime.UtcNow;
                order.OrderLogs.Add(new OrderLog
                {
                    FromStatus = order.OrderStatus,
                    ToStatus = "Confirmed",
                    Note = "Thanh toán VNPay thành công",
                    CreatedAt = DateTime.UtcNow,
                });
                order.OrderStatus = "Confirmed";
            }
            else
            {
                payment.Status = "Failed";
            }

            await _context.SaveChangesAsync(CancellationToken.None);
        }

        var isSuccess = responseCode == "00";
        return Redirect($"{_configuration["Frontend:BaseUrl"]}/payment?orderId={orderId}&status={(isSuccess ? "success" : "fail")}&transactionNo={transactionNo}");
    }

    /// <summary>
    /// VNPay IPN (Instant Payment Notification) - server-to-server callback.
    /// VNPay gửi thông báo thanh toán về endpoint này để cập nhật trạng thái đơn hàng.
    /// </summary>
    [HttpGet("vnpay-ipn")]
    public async Task<IActionResult> VnPayIpn()
    {
        var queryParams = HttpContext.Request.Query
            .ToDictionary(kvp => kvp.Key, kvp => kvp.Value.ToString());

        var isValid = _vnPayService.VerifyIpn(queryParams);

        if (!isValid)
        {
            return Ok(new { RspCode = "97", Message = "Invalid Signature" });
        }

        var txnRef = queryParams.GetValueOrDefault("vnp_TxnRef");
        var orderId = int.Parse(txnRef?.Split('_')[0] ?? "0");
        var responseCode = queryParams.GetValueOrDefault("vnp_ResponseCode");
        var transactionNo = queryParams.GetValueOrDefault("vnp_TransactionNo");
        var amount = queryParams.GetValueOrDefault("vnp_Amount");
        var bankCode = queryParams.GetValueOrDefault("vnp_BankCode");
        var payDate = queryParams.GetValueOrDefault("vnp_PayDate");

        var order = await _context.Orders
            .Include(o => o.Payments)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order == null)
        {
            return Ok(new { RspCode = "01", Message = "Order Not Found" });
        }

        var payment = order.Payments.FirstOrDefault();
        if (payment == null)
        {
            return Ok(new { RspCode = "01", Message = "Payment Not Found" });
        }

        // Kiểm tra nếu giao dịch đã được xử lý trước đó
        if (payment.Status == "Completed")
        {
            return Ok(new { RspCode = "02", Message = "Order Already Confirmed" });
        }

        payment.TransactionCode = transactionNo;

        if (responseCode == "00")
        {
            // Kiểm tra số tiền khớp với đơn hàng
            var vnpayAmount = long.Parse(amount ?? "0") / 100m;
            if (vnpayAmount != payment.Amount)
            {
                payment.Status = "Failed";
                await _context.SaveChangesAsync(CancellationToken.None);
                return Ok(new { RspCode = "04", Message = "Amount Mismatch" });
            }

            payment.Status = "Completed";
            payment.PaidAt = DateTime.UtcNow;
            order.OrderLogs.Add(new OrderLog
            {
                FromStatus = order.OrderStatus,
                ToStatus = "Confirmed",
                Note = "Thanh toán VNPay thành công",
                CreatedAt = DateTime.UtcNow,
            });
            order.OrderStatus = "Confirmed";
        }
        else
        {
            payment.Status = "Failed";
        }

        await _context.SaveChangesAsync(CancellationToken.None);

        return Ok(new { RspCode = "00", Message = "Confirm Success" });
    }

    [HttpGet("admin")]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new Atelier.Application.Payments.Queries.GetAllPaymentsQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }
}
