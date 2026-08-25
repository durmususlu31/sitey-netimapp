using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _dbContext;

    public AuditLogService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<AuditLogResponse>> GetAllAsync(Guid? userId, CancellationToken cancellationToken)
    {
        var query = _dbContext.AuditLogs.AsNoTracking().AsQueryable();
        if (userId.HasValue)
        {
            query = query.Where(x => x.UserId == userId.Value);
        }

        return await query
            .OrderByDescending(x => x.Timestamp)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<AuditLogResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.AuditLogs
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<AuditLogResponse> CreateAsync(CreateAuditLogRequest request, CancellationToken cancellationToken)
    {
        if (request.UserId.HasValue)
        {
            await EnsureUserExistsAsync(request.UserId.Value, cancellationToken);
        }

        var entity = new AuditLog
        {
            UserId = request.UserId,
            Action = request.Action.Trim(),
            EntityName = request.EntityName.Trim(),
            EntityId = request.EntityId,
            Timestamp = request.Timestamp,
            Details = request.Details?.Trim() ?? string.Empty
        };

        _dbContext.AuditLogs.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<AuditLogResponse?> UpdateAsync(Guid id, UpdateAuditLogRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.AuditLogs.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Audit log with id '{id}' was not found.");
        }

        if (request.UserId.HasValue)
        {
            await EnsureUserExistsAsync(request.UserId.Value, cancellationToken);
        }

        entity.UserId = request.UserId;
        entity.Action = request.Action.Trim();
        entity.EntityName = request.EntityName.Trim();
        entity.EntityId = request.EntityId;
        entity.Timestamp = request.Timestamp;
        entity.Details = request.Details?.Trim() ?? string.Empty;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.AuditLogs.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Audit log with id '{id}' was not found.");
        }

        _dbContext.AuditLogs.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task EnsureUserExistsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var userExists = await _dbContext.Users.AnyAsync(x => x.Id == userId, cancellationToken);
        if (!userExists)
        {
            throw new ResourceNotFoundException($"User with id '{userId}' was not found.");
        }
    }

    private static AuditLogResponse MapToResponse(AuditLog entity) => new(
        entity.Id,
        entity.UserId,
        entity.Action,
        entity.EntityName,
        entity.EntityId,
        entity.Timestamp,
        entity.Details);
}
