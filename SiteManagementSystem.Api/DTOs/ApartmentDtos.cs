namespace SiteManagementSystem.Api.DTOs;

public record CreateApartmentRequest(
    Guid BlockId,
    Guid? OwnerId,
    Guid? ResidentId,
    string ApartmentNumber,
    int Floor,
    string ApartmentType,
    string TapuNumber,
    bool IsActive);

public record UpdateApartmentRequest(
    Guid BlockId,
    Guid? OwnerId,
    Guid? ResidentId,
    string ApartmentNumber,
    int Floor,
    string ApartmentType,
    string TapuNumber,
    bool IsActive);

public record ApartmentResponse(
    Guid Id,
    Guid BlockId,
    Guid? OwnerId,
    Guid? ResidentId,
    string ApartmentNumber,
    int Floor,
    string ApartmentType,
    string TapuNumber,
    bool IsActive,
    DateTime CreatedAt,
    DateTime UpdatedAt);
