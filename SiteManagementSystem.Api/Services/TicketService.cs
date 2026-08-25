using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class TicketService : ITicketService
{
    private readonly AppDbContext _dbContext;

    public TicketService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<TicketResponse>> GetAllAsync(Guid? userId, CancellationToken cancellationToken)
    {
        var query = _dbContext.Tickets.AsNoTracking().AsQueryable();
        if (userId.HasValue)
        {
            query = query.Where(x => x.UserId == userId.Value);
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<TicketResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Tickets
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<TicketResponse> CreateAsync(CreateTicketRequest request, CancellationToken cancellationToken)
    {
        await EnsureUserExistsAsync(request.UserId, cancellationToken);

        var entity = new Ticket
        {
            UserId = request.UserId,
            Title = request.Title.Trim(),
            Description = request.Description.Trim(),
            Status = request.Status,
            Priority = request.Priority,
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.Tickets.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<TicketResponse?> UpdateAsync(Guid id, UpdateTicketRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Tickets.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Ticket with id '{id}' was not found.");
        }

        await EnsureUserExistsAsync(request.UserId, cancellationToken);

        entity.UserId = request.UserId;
        entity.Title = request.Title.Trim();
        entity.Description = request.Description.Trim();
        entity.Status = request.Status;
        entity.Priority = request.Priority;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Tickets.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Ticket with id '{id}' was not found.");
        }

        _dbContext.Tickets.Remove(entity);
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

    private static TicketResponse MapToResponse(Ticket entity) => new(
        entity.Id,
        entity.UserId,
        entity.Title,
        entity.Description,
        entity.Status,
        entity.Priority,
        entity.CreatedAt);
}
