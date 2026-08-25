using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IApartmentService
{
    Task<IReadOnlyList<ApartmentResponse>> GetAllAsync(Guid? blockId, string? search, int pageNumber, int pageSize, CancellationToken cancellationToken);
    Task<ApartmentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<ApartmentResponse> CreateAsync(CreateApartmentRequest request, CancellationToken cancellationToken);
    Task<ApartmentResponse?> UpdateAsync(Guid id, UpdateApartmentRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
