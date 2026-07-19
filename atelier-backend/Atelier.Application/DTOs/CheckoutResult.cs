namespace Atelier.Application.DTOs;

public class CheckoutResult
{
    public int OrderId { get; set; }
    public string? PaymentUrl { get; set; }
    public string Message { get; set; } = "Đặt hàng thành công!";
}
