namespace SiteManagementSystem.Api.DTOs;

public record CreateSiteRequest(
    string Name,
    string Address,
    string Phone,
    string Email);

public record UpdateSiteRequest(
    string Name,
    string Address,
    string Phone,
    string Email);

public record SiteResponse(
    Guid Id,
    string Name,
    string Address,
    string Phone,
    string Email,
    DateTime CreatedAt,
    DateTime UpdatedAt);
