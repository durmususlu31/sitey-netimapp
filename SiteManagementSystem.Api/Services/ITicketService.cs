using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface ITicketService
{
    Task<IReadOnlyList<TicketResponse>> GetAllAsync(Guid? userId, CancellationToken cancellationToken);
    Task<TicketResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<TicketResponse> CreateAsync(CreateTicketRequest request, CancellationToken cancellationToken);
    Task<TicketResponse?> UpdateAsync(Guid id, UpdateTicketRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
