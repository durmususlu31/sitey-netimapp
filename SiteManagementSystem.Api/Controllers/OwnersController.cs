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
public class OwnersController : ControllerBase
{
    private readonly IOwnerService _ownerService;

    public OwnersController(IOwnerService ownerService)
    {
        _ownerService = ownerService;
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
        var owners = await _ownerService.GetAllAsync(apartmentId, search, isActive, sortBy, sortDirection, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<OwnerResponse>>.Ok(owners));
    }

    [HttpGet("{apartmentId:guid}/owners")]
    public async Task<IActionResult> GetByApartment(
        Guid apartmentId,
        [FromQuery] string? search,
        [FromQuery] bool? isActive,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        CancellationToken cancellationToken)
    {
        var owners = await _ownerService.GetAllAsync(apartmentId, search, isActive, sortBy, sortDirection, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<OwnerResponse>>.Ok(owners));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var owner = await _ownerService.GetByIdAsync(id, cancellationToken);
        if (owner is null)
        {
            throw new ResourceNotFoundException($"Owner with id '{id}' was not found.");
        }

        return Ok(ApiResponse<OwnerResponse>.Ok(owner));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOwnerRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreateOwnerRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _ownerService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<OwnerResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateOwnerRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdateOwnerRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _ownerService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Owner with id '{id}' was not found.");
        }

        return Ok(ApiResponse<OwnerResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _ownerService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Owner with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }

    [HttpDelete("{apartmentId:guid}/owners/{ownerId:guid}")]
    public async Task<IActionResult> DeleteByApartment(Guid apartmentId, Guid ownerId, CancellationToken cancellationToken)
    {
        var owner = await _ownerService.GetByIdAsync(ownerId, cancellationToken);
        if (owner is null || owner.ApartmentId != apartmentId)
        {
            throw new ResourceNotFoundException($"Owner with id '{ownerId}' was not found for apartment '{apartmentId}'.");
        }

        var deleted = await _ownerService.DeleteAsync(ownerId, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Owner with id '{ownerId}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
