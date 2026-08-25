namespace SiteManagementSystem.Api.Domain.Entities;

public class Due
{
    public Guid Id { get; set; }
    public Guid ApartmentId { get; set; }
    public Guid? TenantId { get; set; }
    public DueType DueType { get; set; } = DueType.AIDAT;
    public decimal Amount { get; set; }
    public string Period { get; set; } = string.Empty;
    public DateTime DueDate { get; set; }
    public DueStatus Status { get; set; } = DueStatus.PENDING;

    // Fatura alt kalemleri ve fatura desteği (opsiyonel)
    public decimal? ElectricityAmount { get; set; }
    public decimal? WaterAmount { get; set; }
    public decimal? GasAmount { get; set; }
    public decimal? BillSupportAmount { get; set; }
    public string? Description { get; set; }

    public Apartment Apartment { get; set; } = null!;
    public Tenant? Tenant { get; set; }
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
