namespace Atelier.Application.DTOs;

public class CategoryAdminDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Slug { get; set; }
    public bool IsActive { get; set; }
    public int ProductCount { get; set; }
}
