namespace Atelier.Domain.Entities;

public class District
{
    public string Code { get; set; } = null!;
    public string Name { get; set; } = null!;
    public string ProvinceCode { get; set; } = null!;

    public virtual Province Province { get; set; } = null!;
    public virtual ICollection<Ward> Wards { get; set; } = new List<Ward>();
}
