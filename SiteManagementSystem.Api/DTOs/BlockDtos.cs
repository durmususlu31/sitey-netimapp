namespace SiteManagementSystem.Api.DTOs;

public record CreateBlockRequest(
    Guid SiteId,
    string Name);

public record UpdateBlockRequest(
    Guid SiteId,
    string Name);

public record BlockResponse(
    Guid Id,
    Guid SiteId,
    string Name,
    DateTime CreatedAt,
    DateTime UpdatedAt);
