namespace SiteManagementSystem.Api.DTOs;

public record CreateTenantRequest(
    Guid ApartmentId,
    string FullName,
    string Phone,
    string Email,
    string IdNumber,
    DateTime? MoveInDate,
    DateTime? MoveOutDate,
    bool IsActive,
    decimal? MonthlyRent = null,
    decimal? MonthlyDue = null,
    decimal? DefaultBillSupport = null);

public record UpdateTenantRequest(
    Guid ApartmentId,
    string FullName,
    string Phone,
    string Email,
    string IdNumber,
    DateTime? MoveInDate,
    DateTime? MoveOutDate,
    bool IsActive,
    decimal? MonthlyRent = null,
    decimal? MonthlyDue = null,
    decimal? DefaultBillSupport = null);

public record TenantResponse(
    Guid Id,
    Guid ApartmentId,
    string FullName,
    string Phone,
    string Email,
    string IdNumber,
    DateTime? MoveInDate,
    DateTime? MoveOutDate,
    bool IsActive,
    decimal? MonthlyRent,
    decimal? MonthlyDue,
    decimal? DefaultBillSupport,
    DateTime CreatedAt,
    DateTime UpdatedAt);
