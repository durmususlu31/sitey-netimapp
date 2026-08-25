using FluentValidation;
using FluentValidation.Results;
using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class PropertyDocumentService : IPropertyDocumentService
{
    private static readonly HashSet<string> AllowedEntityTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "SITE",
        "APARTMENT",
        "OWNER",
        "TENANT",
        "DUE"
    };

    private readonly AppDbContext _dbContext;

    public PropertyDocumentService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<PropertyDocumentResponse>> GetAllAsync(string? entityType, Guid? entityId, CancellationToken cancellationToken)
    {
        var query = _dbContext.PropertyDocuments.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(entityType))
        {
            var normalizedEntityType = NormalizeEntityType(entityType);
            query = query.Where(x => x.EntityType == normalizedEntityType);
        }

        if (entityId.HasValue)
        {
            query = query.Where(x => x.EntityId == entityId.Value);
        }

        return await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(MapToResponseExpression())
            .ToListAsync(cancellationToken);
    }

    public async Task<PropertyDocumentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.PropertyDocuments
            .AsNoTracking()
            .Where(x => x.Id == id)
            .Select(MapToResponseExpression())
            .SingleOrDefaultAsync(cancellationToken);
    }

    public async Task<PropertyDocumentResponse> CreateAsync(CreatePropertyDocumentRequest request, CancellationToken cancellationToken)
    {
        var normalizedEntityType = NormalizeEntityType(request.EntityType);
        await EnsureEntityExistsAsync(normalizedEntityType, request.EntityId, cancellationToken);

        var entity = new PropertyDocument
        {
            EntityType = normalizedEntityType,
            EntityId = request.EntityId,
            DocumentCategory = request.DocumentCategory.Trim(),
            FileName = request.FileName.Trim(),
            FileUrl = request.FileUrl.Trim(),
            Notes = request.Notes.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.PropertyDocuments.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<PropertyDocumentResponse?> UpdateAsync(Guid id, UpdatePropertyDocumentRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.PropertyDocuments.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Property document with id '{id}' was not found.");
        }

        var normalizedEntityType = NormalizeEntityType(request.EntityType);
        await EnsureEntityExistsAsync(normalizedEntityType, request.EntityId, cancellationToken);

        entity.EntityType = normalizedEntityType;
        entity.EntityId = request.EntityId;
        entity.DocumentCategory = request.DocumentCategory.Trim();
        entity.FileName = request.FileName.Trim();
        entity.FileUrl = request.FileUrl.Trim();
        entity.Notes = request.Notes.Trim();

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.PropertyDocuments.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Property document with id '{id}' was not found.");
        }

        _dbContext.PropertyDocuments.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task EnsureEntityExistsAsync(string entityType, Guid entityId, CancellationToken cancellationToken)
    {
        var exists = entityType switch
        {
            "SITE" => await _dbContext.Sites.AnyAsync(x => x.Id == entityId, cancellationToken),
            "APARTMENT" => await _dbContext.Apartments.AnyAsync(x => x.Id == entityId, cancellationToken),
            "OWNER" => await _dbContext.Owners.AnyAsync(x => x.Id == entityId, cancellationToken),
            "TENANT" => await _dbContext.Tenants.AnyAsync(x => x.Id == entityId, cancellationToken),
            "DUE" => await _dbContext.Dues.AnyAsync(x => x.Id == entityId, cancellationToken),
            _ => false
        };

        if (!exists)
        {
            throw new ResourceNotFoundException($"{entityType} with id '{entityId}' was not found.");
        }
    }

    private static string NormalizeEntityType(string entityType)
    {
        var normalizedEntityType = entityType.Trim().ToUpperInvariant();
        if (!AllowedEntityTypes.Contains(normalizedEntityType))
        {
            throw new ValidationException(new[]
            {
                new ValidationFailure(nameof(entityType), $"Unsupported entity type '{entityType}'.")
            });
        }

        return normalizedEntityType;
    }

    private static System.Linq.Expressions.Expression<Func<PropertyDocument, PropertyDocumentResponse>> MapToResponseExpression()
    {
        return entity => new PropertyDocumentResponse(
            entity.Id,
            entity.EntityType,
            entity.EntityId,
            entity.DocumentCategory,
            entity.FileName,
            entity.FileUrl,
            entity.Notes,
            entity.CreatedAt);
    }

    private static PropertyDocumentResponse MapToResponse(PropertyDocument entity) => new(
        entity.Id,
        entity.EntityType,
        entity.EntityId,
        entity.DocumentCategory,
        entity.FileName,
        entity.FileUrl,
        entity.Notes,
        entity.CreatedAt);
}
