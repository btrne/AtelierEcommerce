namespace Atelier.Domain.Entities;

public class UserAddress
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string ContactName { get; set; } = null!;
    public string Phone { get; set; } = null!;
    public string? ProvinceCode { get; set; }
    public string? ProvinceName { get; set; }
    public string? DistrictCode { get; set; }
    public string? DistrictName { get; set; }
    public string? WardCode { get; set; }
    public string? WardName { get; set; }
    public string DetailAddress { get; set; } = null!;
    public string? AddressType { get; set; }
    public bool IsDefault { get; set; }
    public virtual User User { get; set; } = null!;
}
