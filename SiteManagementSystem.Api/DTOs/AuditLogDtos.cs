namespace SiteManagementSystem.Api.DTOs;

public record CreateAuditLogRequest(
    Guid? UserId,
    string Action,
    string EntityName,
    Guid EntityId,
    DateTime Timestamp,
    string Details);

public record UpdateAuditLogRequest(
    Guid? UserId,
    string Action,
    string EntityName,
    Guid EntityId,
    DateTime Timestamp,
    string Details);

public record AuditLogResponse(
    Guid Id,
    Guid? UserId,
    string Action,
    string EntityName,
    Guid EntityId,
    DateTime Timestamp,
    string Details);
