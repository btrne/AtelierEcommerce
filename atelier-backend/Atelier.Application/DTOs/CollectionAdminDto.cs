namespace Atelier.Application.DTOs;

public class CollectionAdminDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public string? BannerImageUrl { get; set; }
    public string? Description { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public int ProductCount { get; set; }
    public int TotalSold { get; set; }
}
