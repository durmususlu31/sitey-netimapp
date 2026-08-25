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
public class PropertyDocumentsController : ControllerBase
{
    private readonly IPropertyDocumentService _propertyDocumentService;

    public PropertyDocumentsController(IPropertyDocumentService propertyDocumentService)
    {
        _propertyDocumentService = propertyDocumentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? entityType, [FromQuery] Guid? entityId, CancellationToken cancellationToken)
    {
        var documents = await _propertyDocumentService.GetAllAsync(entityType, entityId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<PropertyDocumentResponse>>.Ok(documents));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var document = await _propertyDocumentService.GetByIdAsync(id, cancellationToken);
        if (document is null)
        {
            throw new ResourceNotFoundException($"Property document with id '{id}' was not found.");
        }

        return Ok(ApiResponse<PropertyDocumentResponse>.Ok(document));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePropertyDocumentRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreatePropertyDocumentRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _propertyDocumentService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<PropertyDocumentResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyDocumentRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdatePropertyDocumentRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _propertyDocumentService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Property document with id '{id}' was not found.");
        }

        return Ok(ApiResponse<PropertyDocumentResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _propertyDocumentService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Property document with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
