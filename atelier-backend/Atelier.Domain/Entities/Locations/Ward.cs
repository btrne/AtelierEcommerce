namespace Atelier.Domain.Entities;

public class Ward
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string DistrictCode { get; set; } = null!;

    public virtual District District { get; set; } = null!;
}
