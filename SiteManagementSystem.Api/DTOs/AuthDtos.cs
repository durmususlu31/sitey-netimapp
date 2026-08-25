namespace SiteManagementSystem.Api.DTOs;

public record LoginRequest(
    string Email,
    string Password);

public record RefreshTokenRequest(
    string RefreshToken);

public record LogoutRequest(
    string RefreshToken);

public record AuthResponse(
    Guid UserId,
    string Email,
    string Role,
    string AccessToken,
    string RefreshToken,
    DateTime AccessTokenExpiresAt,
    DateTime RefreshTokenExpiresAt);
