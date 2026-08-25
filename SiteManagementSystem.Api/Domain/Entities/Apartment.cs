namespace SiteManagementSystem.Api.Domain.Entities;

public class Apartment
{
    public Guid Id { get; set; }
    public Guid BlockId { get; set; }
    public Guid? OwnerId { get; set; }
    public Guid? ResidentId { get; set; }
    public string ApartmentNumber { get; set; } = string.Empty;
    public int Floor { get; set; }
    public string ApartmentType { get; set; } = string.Empty;
    public string TapuNumber { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Block Block { get; set; } = null!;
    public User? Owner { get; set; }
    public User? Resident { get; set; }
    public ICollection<Owner> Owners { get; set; } = new List<Owner>();
    public ICollection<Tenant> Tenants { get; set; } = new List<Tenant>();
    public ICollection<Due> Dues { get; set; } = new List<Due>();
}
