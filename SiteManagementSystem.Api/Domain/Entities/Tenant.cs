namespace SiteManagementSystem.Api.Domain.Entities;

public class Tenant
{
    public Guid Id { get; set; }
    public Guid ApartmentId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string IdNumber { get; set; } = string.Empty;
    public DateTime? MoveInDate { get; set; }
    public DateTime? MoveOutDate { get; set; }
    public decimal? MonthlyRent { get; set; }
    public decimal? MonthlyDue { get; set; }
    public decimal? DefaultBillSupport { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Apartment Apartment { get; set; } = null!;
    public ICollection<Due> Dues { get; set; } = new List<Due>();
}
