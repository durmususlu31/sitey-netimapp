using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class TenantService : ITenantService
{
    private readonly AppDbContext _dbContext;

    public TenantService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<TenantResponse>> GetAllAsync(Guid? apartmentId, string? search, bool? isActive, string? sortBy, string? sortDirection, CancellationToken cancellationToken)
    {
        var query = _dbContext.Tenants.AsNoTracking().AsQueryable();

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

    public async Task<TenantResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Tenants
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<TenantResponse> CreateAsync(CreateTenantRequest request, CancellationToken cancellationToken)
    {
        var apartmentExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.ApartmentId, cancellationToken);
        if (!apartmentExists)
        {
            throw new ResourceNotFoundException($"Apartment with id '{request.ApartmentId}' was not found.");
        }

        var fullName = request.FullName.Trim();
        var duplicateExists = await _dbContext.Tenants
            .AnyAsync(x => x.ApartmentId == request.ApartmentId && x.FullName == fullName, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_TENANT", "A tenant with this name already exists for this apartment.");
        }

        var entity = new Tenant
        {
            ApartmentId = request.ApartmentId,
            FullName = fullName,
            Phone = request.Phone?.Trim() ?? string.Empty,
            Email = request.Email?.Trim() ?? string.Empty,
            IdNumber = request.IdNumber?.Trim() ?? string.Empty,
            MoveInDate = request.MoveInDate,
            MoveOutDate = request.MoveOutDate,
            IsActive = request.IsActive,
            MonthlyRent = request.MonthlyRent,
            MonthlyDue = request.MonthlyDue,
            DefaultBillSupport = request.DefaultBillSupport,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Tenants.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<TenantResponse?> UpdateAsync(Guid id, UpdateTenantRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Tenants.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Tenant with id '{id}' was not found.");
        }

        var apartmentExists = await _dbContext.Apartments.AnyAsync(x => x.Id == request.ApartmentId, cancellationToken);
        if (!apartmentExists)
        {
            throw new ResourceNotFoundException($"Apartment with id '{request.ApartmentId}' was not found.");
        }

        var fullName = request.FullName.Trim();
        var duplicateExists = await _dbContext.Tenants
            .AnyAsync(x => x.Id != id && x.ApartmentId == request.ApartmentId && x.FullName == fullName, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_TENANT", "A tenant with this name already exists for this apartment.");
        }

        entity.ApartmentId = request.ApartmentId;
        entity.FullName = fullName;
        entity.Phone = request.Phone?.Trim() ?? string.Empty;
        entity.Email = request.Email?.Trim() ?? string.Empty;
        entity.IdNumber = request.IdNumber?.Trim() ?? string.Empty;
        entity.MoveInDate = request.MoveInDate;
        entity.MoveOutDate = request.MoveOutDate;
        entity.IsActive = request.IsActive;
        entity.MonthlyRent = request.MonthlyRent;
        entity.MonthlyDue = request.MonthlyDue;
        entity.DefaultBillSupport = request.DefaultBillSupport;
        entity.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Tenants.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Tenant with id '{id}' was not found.");
        }

        _dbContext.Tenants.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static TenantResponse MapToResponse(Tenant entity) => new(
        entity.Id,
        entity.ApartmentId,
        entity.FullName,
        entity.Phone,
        entity.Email,
        entity.IdNumber,
        entity.MoveInDate,
        entity.MoveOutDate,
        entity.IsActive,
        entity.MonthlyRent,
        entity.MonthlyDue,
        entity.DefaultBillSupport,
        entity.CreatedAt,
        entity.UpdatedAt);

    private static IQueryable<Tenant> ApplySorting(IQueryable<Tenant> query, string? sortBy, string? sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var normalizedSort = sortBy?.Trim().ToLowerInvariant();

        return normalizedSort switch
        {
            "createdat" => descending ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt),
            "moveindate" => descending ? query.OrderByDescending(x => x.MoveInDate) : query.OrderBy(x => x.MoveInDate),
            "apartmentnumber" => descending ? query.OrderByDescending(x => x.Apartment.ApartmentNumber) : query.OrderBy(x => x.Apartment.ApartmentNumber),
            _ => descending ? query.OrderByDescending(x => x.FullName) : query.OrderBy(x => x.FullName)
        };
    }
}
