using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IBlockService
{
    Task<IReadOnlyList<BlockResponse>> GetAllAsync(Guid? siteId, CancellationToken cancellationToken);
    Task<BlockResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<BlockResponse> CreateAsync(CreateBlockRequest request, CancellationToken cancellationToken);
    Task<BlockResponse?> UpdateAsync(Guid id, UpdateBlockRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
