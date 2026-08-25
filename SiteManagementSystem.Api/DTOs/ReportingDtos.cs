namespace SiteManagementSystem.Api.DTOs;

public record FinanceReportResponse(
    decimal TotalDues,
    decimal TotalCollected,
    decimal OutstandingAmount,
    int OverdueCount,
    int PaidCount,
    int PendingCount,
    IReadOnlyList<FinanceTrendPointResponse> MonthlyCollections,
    IReadOnlyList<FinanceTrendPointResponse> MonthlyExpenses,
    IReadOnlyList<OverdueDueSummaryResponse> TopOverdueDues);

public record FinanceTrendPointResponse(
    string Month,
    decimal Amount);

public record OverdueDueSummaryResponse(
    Guid DueId,
    Guid ApartmentId,
    string ApartmentNumber,
    string SiteName,
    decimal Amount,
    decimal RemainingAmount,
    int DaysOverdue);
