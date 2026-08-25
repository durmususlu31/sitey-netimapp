using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class OwnerService : IOwnerService
{
    private readonly AppDbContext _dbContext;

    public OwnerService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<OwnerResponse>> GetAllAsync(Guid? apartmentId, string? search, bool? isActive, string? sortBy, string? sortDirection, CancellationToken cancellationToken)
    {
        var query = _dbContext.Owners.AsNoTracking().AsQueryable();

        if (apartmentId.HasValue)
        {
            query = query.Where(x => x.ApartmentId == apartmentId.Value);
        }

        if (isActive.HasValue)
        {
            query = query.Where(x => x.IsActive == isActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.FullName.Contains(normalizedSearch) ||
                x.Phone.Contains(normalizedSearch) ||
                x.Email.Contains(normalizedSearch) ||
                x.IdNumber.Contains(normalizedSearch) ||
                x.Apartment.ApartmentNumber.Contains(normalizedSearch));
        }

        query = ApplySorting(query, sortBy, sortDirection);

        return await query
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<OwnerResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Owners
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<OwnerResponse> CreateAsync(CreateOwnerRequest request, CancellationToken cancellationToken)
    {
        var apartmentExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.ApartmentId, cancellationToken);
        if (!apartmentExists)
        {
            throw new ResourceNotFoundException($"Apartment with id '{request.ApartmentId}' was not found.");
        }

        var fullName = request.FullName.Trim();
        var duplicateExists = await _dbContext.Owners
            .AnyAsync(x => x.ApartmentId == request.ApartmentId && x.FullName == fullName, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_OWNER", "An owner with this name already exists for this apartment.");
        }

        var entity = new Owner
        {
            ApartmentId = request.ApartmentId,
            FullName = fullName,
            Phone = request.Phone?.Trim() ?? string.Empty,
            Email = request.Email?.Trim() ?? string.Empty,
            IdNumber = request.IdNumber?.Trim() ?? string.Empty,
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Owners.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<OwnerResponse?> UpdateAsync(Guid id, UpdateOwnerRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Owners.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Owner with id '{id}' was not found.");
        }

        var apartmentExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.ApartmentId, cancellationToken);
        if (!apartmentExists)
        {
            throw new ResourceNotFoundException($"Apartment with id '{request.ApartmentId}' was not found.");
        }

        var fullName = request.FullName.Trim();
        var duplicateExists = await _dbContext.Owners
            .AnyAsync(x => x.Id != id && x.ApartmentId == request.ApartmentId && x.FullName == fullName, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_OWNER", "An owner with this name already exists for this apartment.");
        }

        entity.ApartmentId = request.ApartmentId;
        entity.FullName = fullName;
        entity.Phone = request.Phone?.Trim() ?? string.Empty;
        entity.Email = request.Email?.Trim() ?? string.Empty;
        entity.IdNumber = request.IdNumber?.Trim() ?? string.Empty;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Owners.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Owner with id '{id}' was not found.");
        }

        _dbContext.Owners.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static OwnerResponse MapToResponse(Owner entity) => new(
        entity.Id,
        entity.ApartmentId,
        entity.FullName,
        entity.Phone,
        entity.Email,
        entity.IdNumber,
        entity.IsActive,
        entity.CreatedAt,
        entity.UpdatedAt);

    private static IQueryable<Owner> ApplySorting(IQueryable<Owner> query, string? sortBy, string? sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var normalizedSort = sortBy?.Trim().ToLowerInvariant();

        return normalizedSort switch
        {
            "createdat" => descending ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt),
            "updatedat" => descending ? query.OrderByDescending(x => x.UpdatedAt) : query.OrderBy(x => x.UpdatedAt),
            "apartmentnumber" => descending ? query.OrderByDescending(x => x.Apartment.ApartmentNumber) : query.OrderBy(x => x.Apartment.ApartmentNumber),
            _ => descending ? query.OrderByDescending(x => x.FullName) : query.OrderBy(x => x.FullName)
        };
    }
}
