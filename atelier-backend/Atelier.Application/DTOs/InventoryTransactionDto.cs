namespace Atelier.Application.DTOs;

public class InventoryTransactionDto
{
    public int Id { get; set; }
    public int ProductVariantId { get; set; }
    public string? VariantSku { get; set; }
    public string? ProductName { get; set; }
    public string TransactionType { get; set; } = string.Empty;
    public int Quantity { get; set; }
    public string? Note { get; set; }
    public DateTime CreatedAt { get; set; }
}
