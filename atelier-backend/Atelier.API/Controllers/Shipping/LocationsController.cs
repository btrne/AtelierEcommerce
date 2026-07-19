using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Atelier.Application.Common.Interfaces;

namespace Atelier.Api.Controllers.Shipping;

[Route("api/[controller]")]
[ApiController]
public class LocationsController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public LocationsController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("provinces")]
    public async Task<IActionResult> GetProvinces()
    {
        var provinces = await _context.Provinces
            .OrderBy(p => p.Name)
            .Select(p => new { p.Code, p.Name })
            .ToListAsync();
        return Ok(provinces);
    }

    [HttpGet("districts")]
    public async Task<IActionResult> GetDistricts([FromQuery] string provinceCode)
    {
        var districts = await _context.Districts
            .Where(d => d.ProvinceCode == provinceCode)
            .OrderBy(d => d.Name)
            .Select(d => new { d.Code, d.Name })
            .ToListAsync();
        return Ok(districts);
    }

    [HttpGet("wards")]
    public async Task<IActionResult> GetWards([FromQuery] string districtCode)
    {
        var wards = await _context.Wards
            .Where(w => w.DistrictCode == districtCode)
            .OrderBy(w => w.Name)
            .Select(w => new { w.Code, w.Name })
            .ToListAsync();
        return Ok(wards);
    }
}
