using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IExpenseService
{
    Task<IReadOnlyList<ExpenseResponse>> GetAllAsync(CancellationToken cancellationToken);
    Task<ExpenseResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken);
    Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request, CancellationToken cancellationToken);
    Task<ExpenseResponse?> UpdateAsync(Guid id, UpdateExpenseRequest request, CancellationToken cancellationToken);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken);
}
