using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface ITenantService
{
    Task<IReadOnlyList<TenantResponse>> GetAllAsync(Guid? apartmentId, string? search, bool? isActive, string? sortBy, string? sortDirection, CancellationToken cancellationToken);
    Task<TenantResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<TenantResponse> CreateAsync(CreateTenantRequest request, CancellationToken cancellationToken);
    Task<TenantResponse?> UpdateAsync(Guid id, UpdateTenantRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
