namespace SiteManagementSystem.Api.DTOs;

public record CreateExpenseRequest(
    string Title,
    decimal Amount,
    string Category,
    DateTime ExpenseDate,
    string InvoiceUrl);

public record UpdateExpenseRequest(
    string Title,
    decimal Amount,
    string Category,
    DateTime ExpenseDate,
    string InvoiceUrl);

public record ExpenseResponse(
    Guid Id,
    string Title,
    decimal Amount,
    string Category,
    DateTime ExpenseDate,
    string InvoiceUrl);
