using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class AnnouncementService : IAnnouncementService
{
    private readonly AppDbContext _dbContext;

    public AnnouncementService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<AnnouncementResponse>> GetAllAsync(Guid? createdBy, CancellationToken cancellationToken)
    {
        var query = _dbContext.Announcements.AsNoTracking().AsQueryable();
        if (createdBy.HasValue)
        {
            query = query.Where(x => x.CreatedBy == createdBy.Value);
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<AnnouncementResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Announcements
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<AnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        await EnsureUserExistsAsync(request.CreatedBy, cancellationToken);

        var entity = new Announcement
        {
            Title = request.Title.Trim(),
            Content = request.Content.Trim(),
            CreatedBy = request.CreatedBy,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Announcements.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<AnnouncementResponse?> UpdateAsync(Guid id, UpdateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Announcements.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Announcement with id '{id}' was not found.");
        }

        await EnsureUserExistsAsync(request.CreatedBy, cancellationToken);

        entity.Title = request.Title.Trim();
        entity.Content = request.Content.Trim();
        entity.CreatedBy = request.CreatedBy;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Announcements.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Announcement with id '{id}' was not found.");
        }

        _dbContext.Announcements.Remove(entity);
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

    private static AnnouncementResponse MapToResponse(Announcement entity) => new(
        entity.Id,
        entity.Title,
        entity.Content,
        entity.CreatedBy,
        entity.CreatedAt);
}
