namespace SiteManagementSystem.Api.Domain.Entities;

public class Block
{
    public Guid Id { get; set; }
    public Guid SiteId { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Site Site { get; set; } = null!;
    public ICollection<Apartment> Apartments { get; set; } = new List<Apartment>();
}
