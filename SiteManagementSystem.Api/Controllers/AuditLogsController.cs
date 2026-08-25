using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;
using SiteManagementSystem.Api.Services;
using SiteManagementSystem.Api.Validators;

namespace SiteManagementSystem.Api.Controllers;

[ApiController]
[RequireRoles(UserRole.ADMIN)]
[Route("api/[controller]")]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;

    public AuditLogsController(IAuditLogService auditLogService)
    {
        _auditLogService = auditLogService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? userId, CancellationToken cancellationToken)
    {
        var auditLogs = await _auditLogService.GetAllAsync(userId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AuditLogResponse>>.Ok(auditLogs));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var auditLog = await _auditLogService.GetByIdAsync(id, cancellationToken);
        if (auditLog is null)
        {
            throw new ResourceNotFoundException($"Audit log with id '{id}' was not found.");
        }

        return Ok(ApiResponse<AuditLogResponse>.Ok(auditLog));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAuditLogRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreateAuditLogRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _auditLogService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<AuditLogResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAuditLogRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdateAuditLogRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _auditLogService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Audit log with id '{id}' was not found.");
        }

        return Ok(ApiResponse<AuditLogResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _auditLogService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Audit log with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
