namespace SiteManagementSystem.Api.DTOs;

public record CreatePaymentRequest(
    Guid DueId,
    decimal AmountPaid,
    DateTime PaymentDate,
    string PaymentMethod);

public record UpdatePaymentRequest(
    Guid DueId,
    decimal AmountPaid,
    DateTime PaymentDate,
    string PaymentMethod);

public record PaymentResponse(
    Guid Id,
    Guid DueId,
    decimal AmountPaid,
    DateTime PaymentDate,
    string PaymentMethod);
