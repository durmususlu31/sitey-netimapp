using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;
using SiteManagementSystem.Api.Services;
using SiteManagementSystem.Api.Validators;

namespace SiteManagementSystem.Api.Controllers;

[ApiController]
[RequireRoles(UserRole.ADMIN, UserRole.MANAGER)]
[Route("api/[controller]")]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _paymentService;

    public PaymentsController(IPaymentService paymentService)
    {
        _paymentService = paymentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? dueId, CancellationToken cancellationToken)
    {
        var payments = await _paymentService.GetAllAsync(dueId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PaymentResponse>>.Ok(payments));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var payment = await _paymentService.GetByIdAsync(id, cancellationToken);
        if (payment is null)
        {
            throw new ResourceNotFoundException($"Payment with id '{id}' was not found.");
        }

        return Ok(ApiResponse<PaymentResponse>.Ok(payment));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreatePaymentRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _paymentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<PaymentResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePaymentRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdatePaymentRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _paymentService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Payment with id '{id}' was not found.");
        }

        return Ok(ApiResponse<PaymentResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _paymentService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Payment with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
