namespace SiteManagementSystem.Api.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.RESIDENT;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }

    public ICollection<Apartment> OwnedApartments { get; set; } = new List<Apartment>();
    public ICollection<Apartment> ResidentApartments { get; set; } = new List<Apartment>();
    public ICollection<Announcement> Announcements { get; set; } = new List<Announcement>();
    public ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();
    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
