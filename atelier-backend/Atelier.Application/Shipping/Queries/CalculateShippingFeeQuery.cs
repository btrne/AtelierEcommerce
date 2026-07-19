using Atelier.Application.Shipping.Services;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Atelier.Application.Shipping.Queries;

public class ShippingFeeOptionsResult
{
    public List<ShippingFeeResult> Options { get; set; } = new();
}

public class CalculateShippingFeeQuery : IRequest<ShippingFeeOptionsResult>
{
    public string Province { get; set; } = string.Empty;
    public string District { get; set; } = string.Empty;
    public string Ward { get; set; } = string.Empty;
    public decimal Weight { get; set; }
}

public class CalculateShippingFeeQueryHandler : IRequestHandler<CalculateShippingFeeQuery, ShippingFeeOptionsResult>
{
    private readonly IEnumerable<IShippingFeeService> _feeServices;
    private readonly ILogger<CalculateShippingFeeQueryHandler> _logger;

    public CalculateShippingFeeQueryHandler(
        IEnumerable<IShippingFeeService> feeServices,
        ILogger<CalculateShippingFeeQueryHandler> logger)
    {
        _feeServices = feeServices;
        _logger = logger;
    }

    public async Task<ShippingFeeOptionsResult> Handle(CalculateShippingFeeQuery request, CancellationToken cancellationToken)
    {
        var options = new List<ShippingFeeResult>();

        var ghnService = _feeServices.FirstOrDefault(s => s.CarrierCode == "GHN");
        if (ghnService != null)
        {
            var ghnResult = await ghnService.CalculateFeeAsync(
                request.Province, request.District, request.Ward, request.Weight, "standard", cancellationToken);
            options.Add(ghnResult);
        }

        var isHcmc = request.Province.IndexOf("Hồ Chí Minh", StringComparison.OrdinalIgnoreCase) >= 0
                     || request.Province.IndexOf("TPHCM", StringComparison.OrdinalIgnoreCase) >= 0
                     || request.Province.IndexOf("TP. HCM", StringComparison.OrdinalIgnoreCase) >= 0;

        if (isHcmc)
        {
            var lalamoveService = _feeServices.FirstOrDefault(s => s.CarrierCode == "Lalamove");
            if (lalamoveService != null)
            {
                var lalamoveResult = await lalamoveService.CalculateFeeAsync(
                    request.Province, request.District, request.Ward, request.Weight, "express", cancellationToken);
                options.Add(lalamoveResult);
            }
        }

        return new ShippingFeeOptionsResult { Options = options };
    }
}