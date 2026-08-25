using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHashService _passwordHashService;
    private readonly JwtOptions _jwtOptions;

    public AuthService(AppDbContext dbContext, IPasswordHashService passwordHashService, JwtOptions jwtOptions)
    {
        _dbContext = dbContext;
        _passwordHashService = passwordHashService;
        _jwtOptions = jwtOptions;
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _dbContext.Users.SingleOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user is null || !user.IsActive || !_passwordHashService.VerifyPassword(request.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid email or password.");
        }

        return await CreateTokenSetForUserAsync(user, null, cancellationToken);
    }

    public async Task<AuthResponse> RefreshTokenAsync(RefreshTokenRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = ComputeSha256Hash(request.RefreshToken.Trim());
        var refreshToken = await _dbContext.RefreshTokens
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (refreshToken is null || refreshToken.RevokedAt.HasValue || refreshToken.ExpiresAt <= DateTime.UtcNow || !refreshToken.User.IsActive)
        {
            throw new UnauthorizedAccessException("Invalid refresh token.");
        }

        return await CreateTokenSetForUserAsync(refreshToken.User, refreshToken, cancellationToken);
    }

    public async Task LogoutAsync(LogoutRequest request, CancellationToken cancellationToken)
    {
        var tokenHash = ComputeSha256Hash(request.RefreshToken.Trim());
        var refreshToken = await _dbContext.RefreshTokens.SingleOrDefaultAsync(x => x.TokenHash == tokenHash, cancellationToken);

        if (refreshToken is null)
        {
            return;
        }

        if (!refreshToken.RevokedAt.HasValue)
        {
            refreshToken.RevokedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    private async Task<AuthResponse> CreateTokenSetForUserAsync(User user, RefreshToken? existingRefreshToken, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var accessTokenExpiresAt = now.AddMinutes(_jwtOptions.AccessTokenMinutes);
        var refreshTokenExpiresAt = now.AddDays(_jwtOptions.RefreshTokenDays);

        var accessToken = GenerateAccessToken(user, accessTokenExpiresAt);
        var rawRefreshToken = GenerateRefreshToken();
        var refreshTokenHash = ComputeSha256Hash(rawRefreshToken);

        if (existingRefreshToken is not null)
        {
            existingRefreshToken.RevokedAt = now;
            existingRefreshToken.ReplacedByTokenHash = refreshTokenHash;
        }

        var newRefreshToken = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshTokenHash,
            ExpiresAt = refreshTokenExpiresAt,
            CreatedAt = now
        };

        _dbContext.RefreshTokens.Add(newRefreshToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AuthResponse(
            user.Id,
            user.Email,
            user.Role.ToString(),
            accessToken,
            rawRefreshToken,
            accessTokenExpiresAt,
            refreshTokenExpiresAt);
    }

    private string GenerateAccessToken(User user, DateTime expiresAt)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new("user_id", user.Id.ToString()),
            new("email", user.Email),
            new("role", user.Role.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email),
            new(ClaimTypes.Role, user.Role.ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SecretKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: expiresAt,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private static string ComputeSha256Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }
}
