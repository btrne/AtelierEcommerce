namespace Atelier.Application.DTOs;

public class AttributeDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<AttributeOptionDto> Options { get; set; } = new();
    public int ProductCount { get; set; }
}

public class AttributeOptionDto
{
    public int Id { get; set; }
    public int AttributeId { get; set; }
    public string Value { get; set; } = string.Empty;
}
