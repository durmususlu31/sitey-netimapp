using SiteManagementSystem.Api.Domain.Entities;

namespace SiteManagementSystem.Api.DTOs;

public record CreateDueRequest(
    Guid ApartmentId,
    decimal Amount,
    string Period,
    DateTime DueDate,
    DueStatus Status,
    DueType DueType = DueType.AIDAT,
    Guid? TenantId = null,
    decimal? ElectricityAmount = null,
    decimal? WaterAmount = null,
    decimal? GasAmount = null,
    decimal? BillSupportAmount = null,
    string? Description = null);

public record UpdateDueRequest(
    Guid ApartmentId,
    decimal Amount,
    string Period,
    DateTime DueDate,
    DueStatus Status,
    DueType DueType = DueType.AIDAT,
    Guid? TenantId = null,
    decimal? ElectricityAmount = null,
    decimal? WaterAmount = null,
    decimal? GasAmount = null,
    decimal? BillSupportAmount = null,
    string? Description = null);

public record DueResponse(
    Guid Id,
    Guid ApartmentId,
    decimal Amount,
    string Period,
    DateTime DueDate,
    DueStatus Status,
    DueType DueType,
    Guid? TenantId,
    decimal? ElectricityAmount,
    decimal? WaterAmount,
    decimal? GasAmount,
    decimal? BillSupportAmount,
    decimal GrossAmount,
    string? Description,
    decimal TotalPaid,
    decimal RemainingAmount,
    bool IsOverdue,
    int DaysOverdue);

public record BulkCreateDuesRequest(
    IReadOnlyList<Guid>? ApartmentIds,
    Guid? SiteId,
    Guid? BlockId,
    string Period,
    DateTime DueDate,
    DueStatus Status = DueStatus.PENDING,
    DueType DueType = DueType.AIDAT,
    string AmountMode = "FIXED",
    decimal? FixedAmount = null,
    decimal? ElectricityAmount = null,
    decimal? WaterAmount = null,
    decimal? GasAmount = null,
    decimal? BillSupportAmount = null,
    string? Description = null,
    bool SkipDuplicates = true);

public record BulkCreateDuesResponse(
    int TotalTargeted,
    int CreatedCount,
    int SkippedCount,
    IReadOnlyList<string> Messages,
    IReadOnlyList<DueResponse> CreatedDues);

public record BulkImportDueRowRequest(
    string? SiteName,
    string? BlockName,
    string ApartmentNumber,
    string Period,
    DateTime DueDate,
    DueType DueType = DueType.AIDAT,
    decimal? Amount = null,
    decimal? ElectricityAmount = null,
    decimal? WaterAmount = null,
    decimal? GasAmount = null,
    decimal? BillSupportAmount = null,
    string? Description = null);

public record BulkImportResultResponse(
    int TotalRows,
    int SuccessCount,
    int SkippedCount,
    int ErrorCount,
    IReadOnlyList<string> Logs,
    IReadOnlyList<DueResponse> ImportedDues);
