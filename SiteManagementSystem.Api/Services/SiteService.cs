using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class SiteService : ISiteService
{
    private readonly AppDbContext _dbContext;

    public SiteService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<SiteResponse>> GetAllAsync(string? search, string? sortBy, string? sortDirection, CancellationToken cancellationToken)
    {
        var query = _dbContext.Sites.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.Name.Contains(normalizedSearch) ||
                x.Address.Contains(normalizedSearch) ||
                x.Phone.Contains(normalizedSearch) ||
                x.Email.Contains(normalizedSearch));
        }

        query = ApplySorting(query, sortBy, sortDirection);

        return await query
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<SiteResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Sites
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<IReadOnlyList<BlockResponse>> GetBlocksBySiteIdAsync(Guid siteId, CancellationToken cancellationToken)
    {
        return await _dbContext.Blocks
            .AsNoTracking()
            .Where(x => x.SiteId == siteId)
            .OrderBy(x => x.Name)
            .Select(x => new BlockResponse(x.Id, x.SiteId, x.Name, x.CreatedAt, x.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<BlockResponse?> GetBlockByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Blocks
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : new BlockResponse(entity.Id, entity.SiteId, entity.Name, entity.CreatedAt, entity.UpdatedAt);
    }

    public async Task<SiteResponse> CreateAsync(CreateSiteRequest request, CancellationToken cancellationToken)
    {
        var entity = new Site
        {
            Name = request.Name.Trim(),
            Address = request.Address?.Trim() ?? string.Empty,
            Phone = request.Phone?.Trim() ?? string.Empty,
            Email = request.Email?.Trim() ?? string.Empty,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Sites.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(entity);
    }

    public async Task<SiteResponse?> UpdateAsync(Guid id, UpdateSiteRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Sites
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            throw new ResourceNotFoundException($"Site with id '{id}' was not found.");
        }

        entity.Name = request.Name.Trim();
        entity.Address = request.Address?.Trim() ?? string.Empty;
        entity.Phone = request.Phone?.Trim() ?? string.Empty;
        entity.Email = request.Email?.Trim() ?? string.Empty;
        entity.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Sites
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            throw new ResourceNotFoundException($"Site with id '{id}' was not found.");
        }

        _dbContext.Sites.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeleteBlockAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Blocks
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            throw new ResourceNotFoundException($"Block with id '{id}' was not found.");
        }

        _dbContext.Blocks.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static SiteResponse MapToResponse(Site entity) => new(
        entity.Id,
        entity.Name,
        entity.Address,
        entity.Phone,
        entity.Email,
        entity.CreatedAt,
        entity.UpdatedAt);

    private static IQueryable<Site> ApplySorting(IQueryable<Site> query, string? sortBy, string? sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var normalizedSort = sortBy?.Trim().ToLowerInvariant();

        return normalizedSort switch
        {
            "createdat" => descending ? query.OrderByDescending(x => x.CreatedAt) : query.OrderBy(x => x.CreatedAt),
            "updatedat" => descending ? query.OrderByDescending(x => x.UpdatedAt) : query.OrderBy(x => x.UpdatedAt),
            _ => descending ? query.OrderByDescending(x => x.Name) : query.OrderBy(x => x.Name)
        };
    }
}
