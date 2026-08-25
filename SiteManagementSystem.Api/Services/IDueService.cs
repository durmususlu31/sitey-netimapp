using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Domain.Entities;

namespace SiteManagementSystem.Api.Services;

public interface IDueService
{
    Task<IReadOnlyList<DueResponse>> GetAllAsync(
        Guid? apartmentId,
        Guid? siteId,
        Guid? tenantId,
        string? month,
        string? search,
        DueStatus? status,
        DueType? dueType,
        bool? isOverdue,
        string? sortBy,
        string? sortDirection,
        CancellationToken cancellationToken);
    Task<DueResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<DueResponse> CreateAsync(CreateDueRequest request, CancellationToken cancellationToken);
    Task<BulkCreateDuesResponse> BulkCreateAsync(BulkCreateDuesRequest request, CancellationToken cancellationToken);
    Task<BulkImportResultResponse> ImportDuesAsync(IReadOnlyList<BulkImportDueRowRequest> rows, CancellationToken cancellationToken);
    Task<DueResponse?> UpdateAsync(Guid id, UpdateDueRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
