using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public interface IReportingService
{
    Task<FinanceReportResponse> GetFinanceReportAsync(CancellationToken cancellationToken);
}
