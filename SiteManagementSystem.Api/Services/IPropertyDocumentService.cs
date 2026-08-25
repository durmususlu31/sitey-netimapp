using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IPropertyDocumentService
{
    Task<IReadOnlyList<PropertyDocumentResponse>> GetAllAsync(string? entityType, Guid? entityId, CancellationToken cancellationToken);
    Task<PropertyDocumentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<PropertyDocumentResponse> CreateAsync(CreatePropertyDocumentRequest request, CancellationToken cancellationToken);
    Task<PropertyDocumentResponse?> UpdateAsync(Guid id, UpdatePropertyDocumentRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
