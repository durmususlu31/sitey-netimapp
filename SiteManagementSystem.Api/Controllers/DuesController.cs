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
public class DuesController : ControllerBase
{
    private readonly IDueService _dueService;

    public DuesController(IDueService dueService)
    {
        _dueService = dueService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? apartmentId,
        [FromQuery] Guid? siteId,
        [FromQuery] Guid? tenantId,
        [FromQuery] string? month,
        [FromQuery] string? search,
        [FromQuery] DueStatus? status,
        [FromQuery] DueType? dueType,
        [FromQuery] bool? isOverdue,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        CancellationToken cancellationToken)
    {
        var dues = await _dueService.GetAllAsync(
            apartmentId,
            siteId,
            tenantId,
            month,
            search,
            status,
            dueType,
            isOverdue,
            sortBy,
            sortDirection,
            cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<DueResponse>>.Ok(dues));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var due = await _dueService.GetByIdAsync(id, cancellationToken);
        if (due is null)
        {
            throw new ResourceNotFoundException($"Due with id '{id}' was not found.");
        }

        return Ok(ApiResponse<DueResponse>.Ok(due));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateDueRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreateDueRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _dueService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<DueResponse>.Ok(created));
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkCreate([FromBody] BulkCreateDuesRequest request, CancellationToken cancellationToken)
    {
        var response = await _dueService.BulkCreateAsync(request, cancellationToken);
        return Ok(ApiResponse<BulkCreateDuesResponse>.Ok(response));
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] IReadOnlyList<BulkImportDueRowRequest> rows, CancellationToken cancellationToken)
    {
        var response = await _dueService.ImportDuesAsync(rows, cancellationToken);
        return Ok(ApiResponse<BulkImportResultResponse>.Ok(response));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateDueRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdateDueRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _dueService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Due with id '{id}' was not found.");
        }

        return Ok(ApiResponse<DueResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _dueService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Due with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
