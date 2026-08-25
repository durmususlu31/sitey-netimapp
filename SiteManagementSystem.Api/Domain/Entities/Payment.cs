namespace SiteManagementSystem.Api.Domain.Entities;

public class Payment
{
    public Guid Id { get; set; }
    public Guid DueId { get; set; }
    public decimal AmountPaid { get; set; }
    public DateTime PaymentDate { get; set; }
    public string PaymentMethod { get; set; } = string.Empty;

    public Due Due { get; set; } = null!;
}
