using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IAuditLogService
{
    Task<IReadOnlyList<AuditLogResponse>> GetAllAsync(Guid? userId, CancellationToken cancellationToken);
    Task<AuditLogResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<AuditLogResponse> CreateAsync(CreateAuditLogRequest request, CancellationToken cancellationToken);
    Task<AuditLogResponse?> UpdateAsync(Guid id, UpdateAuditLogRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
