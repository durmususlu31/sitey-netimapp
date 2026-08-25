namespace SiteManagementSystem.Api.Domain.Entities;

public enum UserRole
{
    ADMIN = 1,
    RESIDENT = 2,
    MANAGER = 3
}

public enum DueStatus
{
    PENDING = 1,
    PAID = 2,
    OVERDUE = 3
}

public enum DueType
{
    AIDAT = 1,
    KIRA = 2,
    FATURA = 3,
    DIGER = 4
}

public enum TicketStatus
{
    OPEN = 1,
    IN_PROGRESS = 2,
    RESOLVED = 3
}

public enum TicketPriority
{
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3,
    URGENT = 4
}
