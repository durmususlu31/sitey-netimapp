using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _dbContext;
    private readonly IPasswordHashService _passwordHashService;

    public UserService(AppDbContext dbContext, IPasswordHashService passwordHashService)
    {
        _dbContext = dbContext;
        _passwordHashService = passwordHashService;
    }

    public async Task<IReadOnlyList<UserResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .OrderBy(x => x.FullName)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<UserResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<UserResponse> CreateAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var duplicateExists = await _dbContext.Users.AnyAsync(x => x.Email == email, cancellationToken);
        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_USER_EMAIL", "A user with this email already exists.");
        }

        var entity = new User
        {
            Email = email,
            PasswordHash = _passwordHashService.HashPassword(request.Password),
            FullName = request.FullName.Trim(),
            Phone = request.Phone?.Trim() ?? string.Empty,
            Role = request.Role,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Users.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<UserResponse?> UpdateAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Users.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"User with id '{id}' was not found.");
        }

        var email = request.Email.Trim().ToLowerInvariant();
        var duplicateExists = await _dbContext.Users
            .AnyAsync(x => x.Id != id && x.Email == email, cancellationToken);
        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_USER_EMAIL", "A user with this email already exists.");
        }

        entity.Email = email;
        entity.PasswordHash = _passwordHashService.HashPassword(request.Password);
        entity.FullName = request.FullName.Trim();
        entity.Phone = request.Phone?.Trim() ?? string.Empty;
        entity.Role = request.Role;
        entity.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Users.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"User with id '{id}' was not found.");
        }

        _dbContext.Users.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static UserResponse MapToResponse(User entity) => new(
        entity.Id,
        entity.Email,
        entity.FullName,
        entity.Phone,
        entity.Role,
        entity.IsActive,
        entity.CreatedAt);
}
