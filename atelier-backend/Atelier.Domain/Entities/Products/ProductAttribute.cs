namespace Atelier.Domain.Entities;
using System.ComponentModel.DataAnnotations;

public class ProductAttribute
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public virtual ICollection<AttributeOption> AttributeOptions { get; set; } = new List<AttributeOption>();
}
