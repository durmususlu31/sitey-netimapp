namespace SiteManagementSystem.Api.Domain.Entities;

public class Ticket
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public TicketStatus Status { get; set; } = TicketStatus.OPEN;
    public TicketPriority Priority { get; set; } = TicketPriority.MEDIUM;
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
