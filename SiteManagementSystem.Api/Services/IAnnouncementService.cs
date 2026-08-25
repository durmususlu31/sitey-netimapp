using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IAnnouncementService
{
    Task<IReadOnlyList<AnnouncementResponse>> GetAllAsync(Guid? createdBy, CancellationToken cancellationToken);
    Task<AnnouncementResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<AnnouncementResponse> CreateAsync(CreateAnnouncementRequest request, CancellationToken cancellationToken);
    Task<AnnouncementResponse?> UpdateAsync(Guid id, UpdateAnnouncementRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
