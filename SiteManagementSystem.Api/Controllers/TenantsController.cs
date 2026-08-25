using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;
using SiteManagementSystem.Api.Services;
using SiteManagementSystem.Api.Validators;

namespace SiteManagementSystem.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/[controller]")]
public class TenantsController : ControllerBase
{
    private readonly ITenantService _tenantService;

    public TenantsController(ITenantService tenantService)
    {
        _tenantService = tenantService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] Guid? apartmentId,
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        CancellationToken cancellationToken)
    {
        var tenants = await _tenantService.GetAllAsync(apartmentId, search, isActive, sortBy, sortDirection, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TenantResponse>>.Ok(tenants));
    }

    [HttpGet("{apartmentId:guid}/tenants")]
    public async Task<IActionResult> GetByApartment(
        Guid apartmentId,
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        CancellationToken cancellationToken)
    {
        var tenants = await _tenantService.GetAllAsync(apartmentId, search, isActive, sortBy, sortDirection, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<TenantResponse>>.Ok(tenants));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var tenant = await _tenantService.GetByIdAsync(id, cancellationToken);
        if (tenant is null)
        {
            throw new ResourceNotFoundException($"Tenant with id '{id}' was not found.");
        }

        return Ok(ApiResponse<TenantResponse>.Ok(tenant));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTenantRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreateTenantRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _tenantService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<TenantResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateTenantRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdateTenantRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _tenantService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Tenant with id '{id}' was not found.");
        }

        return Ok(ApiResponse<TenantResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _tenantService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Tenant with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }

    [HttpDelete("{apartmentId:guid}/tenants/{tenantId:guid}")]
    public async Task<IActionResult> DeleteByApartment(Guid apartmentId, Guid tenantId, CancellationToken cancellationToken)
    {
        var tenant = await _tenantService.GetByIdAsync(tenantId, cancellationToken);
        if (tenant is null || tenant.ApartmentId != apartmentId)
        {
            throw new ResourceNotFoundException($"Tenant with id '{tenantId}' was not found for apartment '{apartmentId}'.");
        }

        var deleted = await _tenantService.DeleteAsync(tenantId, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Tenant with id '{tenantId}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
