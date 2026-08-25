using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IPaymentService
{
    Task<IReadOnlyList<PaymentResponse>> GetAllAsync(Guid? dueId, CancellationToken cancellationToken);
    Task<PaymentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<PaymentResponse> CreateAsync(CreatePaymentRequest request, CancellationToken cancellationToken);
    Task<PaymentResponse?> UpdateAsync(Guid id, UpdatePaymentRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
