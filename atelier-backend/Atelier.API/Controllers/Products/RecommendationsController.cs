using Atelier.Application.Recommendations.Queries;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Atelier.Api.Controllers.Products;

[ApiController]
[Route("api/[controller]")]
public class RecommendationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public RecommendationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("similar-products/{productId}")]
    public async Task<IActionResult> GetSimilarProducts(int productId, [FromQuery] int take = 20)
    {
        var result = await _mediator.Send(new GetSimilarProductsQuery { ProductId = productId, Take = take });
        return Ok(result);
    }

    [HttpGet("collections/{collectionId}")]
    public async Task<IActionResult> GetCollectionRecommendations(int collectionId, [FromQuery] int take = 4)
    {
        var result = await _mediator.Send(new GetCollectionRecommendationsQuery { CollectionId = collectionId, Take = take });
        return Ok(result);
    }

    [HttpGet("frequently-bought-together/{productId}")]
    public async Task<IActionResult> GetFrequentlyBoughtTogether(int productId, [FromQuery] int take = 5)
    {
        var result = await _mediator.Send(new GetFrequentlyBoughtTogetherQuery { ProductId = productId, Take = take });
        return Ok(result);
    }
}
