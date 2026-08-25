using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IOwnerService
{
    Task<IReadOnlyList<OwnerResponse>> GetAllAsync(Guid? apartmentId, string? search, bool? isActive, string? sortBy, string? sortDirection, CancellationToken cancellationToken);
    Task<OwnerResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<OwnerResponse> CreateAsync(CreateOwnerRequest request, CancellationToken cancellationToken);
    Task<OwnerResponse?> UpdateAsync(Guid id, UpdateOwnerRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
