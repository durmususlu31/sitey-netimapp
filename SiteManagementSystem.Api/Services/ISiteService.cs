using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface ISiteService
{
    Task<IReadOnlyList<SiteResponse>> GetAllAsync(string? search, string? sortBy, string? sortDirection, CancellationToken cancellationToken);
    Task<SiteResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<IReadOnlyList<BlockResponse>> GetBlocksBySiteIdAsync(Guid siteId, CancellationToken cancellationToken);
    Task<BlockResponse?> GetBlockByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<SiteResponse> CreateAsync(CreateSiteRequest request, CancellationToken cancellationToken);
    Task<SiteResponse?> UpdateAsync(Guid id, UpdateSiteRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
    Task<bool> DeleteBlockAsync(Guid id, CancellationToken cancellationToken);
}
