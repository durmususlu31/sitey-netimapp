using SiteManagementSystem.Api.Domain.Entities;

namespace SiteManagementSystem.Api.DTOs;

public record CreateUserRequest(
    string Email,
    string Password,
    string FullName,
    string Phone,
    UserRole Role,
    bool IsActive);

public record UpdateUserRequest(
    string Email,
    string Password,
    string FullName,
    string Phone,
    UserRole Role,
    bool IsActive);

public record UserResponse(
    Guid Id,
    string Email,
    string FullName,
    string Phone,
    UserRole Role,
    bool IsActive,
    DateTime CreatedAt);
