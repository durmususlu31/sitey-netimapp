using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class BlockService : IBlockService
{
    private readonly AppDbContext _dbContext;

    public BlockService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<BlockResponse>> GetAllAsync(Guid? siteId, CancellationToken cancellationToken)
    {
        var query = _dbContext.Blocks
            .AsNoTracking()
            .AsQueryable();

        if (siteId.HasValue)
        {
            query = query.Where(x => x.SiteId == siteId.Value);
        }

        return await query
            .OrderBy(x => x.Name)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<BlockResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Blocks
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<BlockResponse> CreateAsync(CreateBlockRequest request, CancellationToken cancellationToken)
    {
        var siteExists = await _dbContext.Sites
            .AnyAsync(x => x.Id == request.SiteId, cancellationToken);

        if (!siteExists)
        {
            throw new ResourceNotFoundException($"Site with id '{request.SiteId}' was not found.");
        }

        var normalizedName = request.Name.Trim();
        var duplicateExists = await _dbContext.Blocks
            .AnyAsync(x => x.SiteId == request.SiteId && x.Name == normalizedName, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_BLOCK", "A block with this name already exists in this site.");
        }

        var entity = new Block
        {
            SiteId = request.SiteId,
            Name = normalizedName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _dbContext.Blocks.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return MapToResponse(entity);
    }

    public async Task<BlockResponse?> UpdateAsync(Guid id, UpdateBlockRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Blocks
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            throw new ResourceNotFoundException($"Block with id '{id}' was not found.");
        }

        var siteExists = await _dbContext.Sites
            .AnyAsync(x => x.Id == request.SiteId, cancellationToken);

        if (!siteExists)
        {
            throw new ResourceNotFoundException($"Site with id '{request.SiteId}' was not found.");
        }

        var normalizedName = request.Name.Trim();
        var duplicateExists = await _dbContext.Blocks
            .AnyAsync(x => x.Id != id && x.SiteId == request.SiteId && x.Name == normalizedName, cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_BLOCK", "A block with this name already exists in this site.");
        }

        entity.SiteId = request.SiteId;
        entity.Name = normalizedName;
        entity.UpdatedAt = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
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

    private static BlockResponse MapToResponse(Block entity) => new(
        entity.Id,
        entity.SiteId,
        entity.Name,
        entity.CreatedAt,
        entity.UpdatedAt);
}
