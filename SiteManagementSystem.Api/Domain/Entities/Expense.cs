namespace SiteManagementSystem.Api.Domain.Entities;

public class Expense
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Category { get; set; } = string.Empty;
    public DateTime ExpenseDate { get; set; }
    public string InvoiceUrl { get; set; } = string.Empty;
}
