using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class ApartmentService : IApartmentService
{
    private readonly AppDbContext _dbContext;

    public ApartmentService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ApartmentResponse>> GetAllAsync(Guid? blockId, string? search, int pageNumber, int pageSize, CancellationToken cancellationToken)
    {
        var query = _dbContext.Apartments
            .AsNoTracking()
            .AsQueryable();

        if (blockId.HasValue)
        {
            query = query.Where(x => x.BlockId == blockId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.ApartmentNumber.Contains(normalizedSearch) ||
                x.TapuNumber.Contains(normalizedSearch) ||
                x.ApartmentType.Contains(normalizedSearch));
        }

        var safePageNumber = pageNumber < 1 ? 1 : pageNumber;
        var safePageSize = pageSize < 1 ? 20 : Math.Min(pageSize, 200);

        return await query
            .OrderBy(x => x.Floor)
            .ThenBy(x => x.ApartmentNumber)
            .Skip((safePageNumber - 1) * safePageSize)
            .Take(safePageSize)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<ApartmentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Apartments
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<ApartmentResponse> CreateAsync(CreateApartmentRequest request, CancellationToken cancellationToken)
    {
        var blockExists = await _dbContext.Blocks
            .AnyAsync(x => x.Id == request.BlockId, cancellationToken);

        if (!blockExists)
        {
            throw new ResourceNotFoundException($"Block with id '{request.BlockId}' was not found.");
        }

        var apartmentNumber = request.ApartmentNumber.Trim();
        var duplicateExists = await _dbContext.Apartments
            .AnyAsync(x => x.BlockId == request.BlockId && x.ApartmentNumber == apartmentNumber, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_APARTMENT", "An apartment with this number already exists in this block.");
        }

        await ValidateApartmentUsersAsync(request.OwnerId, request.ResidentId, cancellationToken);

        var entity = new Apartment
        {
            BlockId = request.BlockId,
            OwnerId = request.OwnerId,
            ResidentId = request.ResidentId,
            ApartmentNumber = apartmentNumber,
            Floor = request.Floor,
            ApartmentType = request.ApartmentType.Trim(),
            TapuNumber = request.TapuNumber.Trim(),
            IsActive = request.IsActive,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Apartments.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(entity);
    }

    public async Task<ApartmentResponse?> UpdateAsync(Guid id, UpdateApartmentRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Apartments
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            throw new ResourceNotFoundException($"Apartment with id '{id}' was not found.");
        }

        var blockExists = await _dbContext.Blocks
            .AnyAsync(x => x.Id == request.BlockId, cancellationToken);

        if (!blockExists)
        {
            throw new ResourceNotFoundException($"Block with id '{request.BlockId}' was not found.");
        }

        var apartmentNumber = request.ApartmentNumber.Trim();
        var duplicateExists = await _dbContext.Apartments
            .AnyAsync(x => x.Id != id && x.BlockId == request.BlockId && x.ApartmentNumber == apartmentNumber, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_APARTMENT", "An apartment with this number already exists in this block.");
        }

        entity.BlockId = request.BlockId;
        entity.OwnerId = request.OwnerId;
        entity.ResidentId = request.ResidentId;
        entity.ApartmentNumber = apartmentNumber;
        entity.Floor = request.Floor;
        entity.ApartmentType = request.ApartmentType.Trim();
        entity.TapuNumber = request.TapuNumber.Trim();
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await ValidateApartmentUsersAsync(request.OwnerId, request.ResidentId, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Apartments
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            throw new ResourceNotFoundException($"Apartment with id '{id}' was not found.");
        }

        _dbContext.Apartments.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static ApartmentResponse MapToResponse(Apartment entity) => new(
        entity.Id,
        entity.BlockId,
        entity.OwnerId,
        entity.ResidentId,
        entity.ApartmentNumber,
        entity.Floor,
        entity.ApartmentType,
        entity.TapuNumber,
        entity.IsActive,
        entity.CreatedAt,
        entity.UpdatedAt);

    private async Task ValidateApartmentUsersAsync(Guid? ownerId, Guid? residentId, CancellationToken cancellationToken)
    {
        if (ownerId.HasValue)
        {
            var ownerExists = await _dbContext.Users.AnyAsync(x => x.Id == ownerId.Value, cancellationToken);
            if (!ownerExists)
            {
                throw new ResourceNotFoundException($"User with id '{ownerId.Value}' was not found.");
            }
        }

        if (residentId.HasValue)
        {
            var residentExists = await _dbContext.Users.AnyAsync(x => x.Id == residentId.Value, cancellationToken);
            if (!residentExists)
            {
                throw new ResourceNotFoundException($"User with id '{residentId.Value}' was not found.");
            }
        }
    }
}
