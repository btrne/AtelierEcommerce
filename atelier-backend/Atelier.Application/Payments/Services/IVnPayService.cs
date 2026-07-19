using Atelier.Domain.Entities;

namespace Atelier.Application.Payments.Services;

public interface IVnPayService
{
    string CreatePaymentUrl(Order order, string? returnUrl = null);
    bool VerifyIpn(IDictionary<string, string> queryParams);
}
