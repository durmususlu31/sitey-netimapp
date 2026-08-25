namespace SiteManagementSystem.Api.DTOs;

public record CreateAnnouncementRequest(
    string Title,
    string Content,
    Guid CreatedBy);

public record UpdateAnnouncementRequest(
    string Title,
    string Content,
    Guid CreatedBy);

public record AnnouncementResponse(
    Guid Id,
    string Title,
    string Content,
    Guid CreatedBy,
    DateTime CreatedAt);
