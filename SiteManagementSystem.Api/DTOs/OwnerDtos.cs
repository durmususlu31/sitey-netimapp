namespace SiteManagementSystem.Api.DTOs;

public record CreateOwnerRequest(
    Guid ApartmentId,
    string FullName,
    string Phone,
    string Email,
    string IdNumber,
    bool IsActive);

public record UpdateOwnerRequest(
    Guid ApartmentId,
    string FullName,
    string Phone,
    string Email,
    string IdNumber,
    bool IsActive);

public record OwnerResponse(
    Guid Id,
    Guid ApartmentId,
    string FullName,
    string Phone,
    string Email,
    string IdNumber,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);
