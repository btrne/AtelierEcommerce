using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Atelier.Application.Dashboard.Queries;

namespace Atelier.Api.Controllers.Analytics
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class DashboardController : ControllerBase
    {
        private readonly IMediator _mediator;

        public DashboardController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] int days = 7)
        {
            var result = await _mediator.Send(new GetDashboardStatsQuery { Days = days });
            return Ok(result);
        }

        [HttpGet("best-sellers")]
        public async Task<IActionResult> GetBestSellers([FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetBestSellersQuery { TopN = topN });
            return Ok(result);
        }

        [HttpGet("revenue-by-period")]
        public async Task<IActionResult> GetRevenueByPeriod(
            [FromQuery] PeriodType period = PeriodType.Monthly,
            [FromQuery] int numberOfPeriods = 12)
        {
            var result = await _mediator.Send(new GetRevenueByPeriodQuery
            {
                Period = period,
                NumberOfPeriods = numberOfPeriods
            });
            return Ok(result);
        }

        [HttpGet("revenue-by-category")]
        public async Task<IActionResult> GetRevenueByCategory(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null)
        {
            var result = await _mediator.Send(new GetRevenueByCategoryQuery
            {
                DateFrom = dateFrom,
                DateTo = dateTo
            });
            return Ok(result);
        }

        [HttpGet("revenue-by-collection")]
        public async Task<IActionResult> GetRevenueByCollection(
            [FromQuery] DateTime? dateFrom = null,
            [FromQuery] DateTime? dateTo = null)
        {
            var result = await _mediator.Send(new GetRevenueByCollectionQuery
            {
                DateFrom = dateFrom,
                DateTo = dateTo
            });
            return Ok(result);
        }

        [HttpGet("top-customers")]
        public async Task<IActionResult> GetTopCustomers([FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetTopCustomersQuery { TopN = topN });
            return Ok(result);
        }

        [HttpGet("order-status")]
        public async Task<IActionResult> GetOrderStatusDistribution()
        {
            var result = await _mediator.Send(new GetOrderStatusDistributionQuery());
            return Ok(result);
        }

        [HttpGet("new-customers")]
        public async Task<IActionResult> GetNewCustomerCount([FromQuery] int days = 30)
        {
            var result = await _mediator.Send(new GetNewCustomerCountQuery { Days = days });
            return Ok(result);
        }

        [HttpGet("monthly-stats")]
        public async Task<IActionResult> GetMonthlyStats()
        {
            var result = await _mediator.Send(new GetMonthlyStatsQuery());
            return Ok(result);
        }

        [HttpGet("top-viewed")]
        public async Task<IActionResult> GetTopViewed([FromQuery] int days = 7, [FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetTopViewedProductsQuery { Days = days, TopN = topN });
            return Ok(result);
        }

        [HttpGet("search-keywords")]
        public async Task<IActionResult> GetSearchKeywords([FromQuery] int days = 7, [FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetSearchKeywordsQuery { Days = days, TopN = topN });
            return Ok(result);
        }

        [HttpGet("tracking-summary")]
        public async Task<IActionResult> GetTrackingSummary([FromQuery] int days = 7)
        {
            var result = await _mediator.Send(new GetTrackingSummaryQuery { Days = days });
            return Ok(result);
        }

        [HttpGet("low-conversion")]
        public async Task<IActionResult> GetLowConversion([FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetLowConversionProductsQuery { TopN = topN });
            return Ok(result);
        }

        [HttpGet("top-add-to-cart")]
        public async Task<IActionResult> GetTopAddToCart([FromQuery] int days = 7, [FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetTopAddToCartProductsQuery { Days = days, TopN = topN });
            return Ok(result);
        }

        [HttpGet("top-wishlist")]
        public async Task<IActionResult> GetTopWishlist([FromQuery] int days = 7, [FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetTopWishlistProductsQuery { Days = days, TopN = topN });
            return Ok(result);
        }

        [HttpGet("top-searched")]
        public async Task<IActionResult> GetTopSearched([FromQuery] int days = 7, [FromQuery] int topN = 5)
        {
            var result = await _mediator.Send(new GetTopSearchedProductsQuery { Days = days, TopN = topN });
            return Ok(result);
        }
    }
}