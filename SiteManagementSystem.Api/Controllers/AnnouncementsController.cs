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
public class AnnouncementsController : ControllerBase
{
    private readonly IAnnouncementService _announcementService;

    public AnnouncementsController(IAnnouncementService announcementService)
    {
        _announcementService = announcementService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? createdBy, CancellationToken cancellationToken)
    {
        var announcements = await _announcementService.GetAllAsync(createdBy, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<AnnouncementResponse>>.Ok(announcements));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var announcement = await _announcementService.GetByIdAsync(id, cancellationToken);
        if (announcement is null)
        {
            throw new ResourceNotFoundException($"Announcement with id '{id}' was not found.");
        }

        return Ok(ApiResponse<AnnouncementResponse>.Ok(announcement));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreateAnnouncementRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _announcementService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<AnnouncementResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAnnouncementRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdateAnnouncementRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _announcementService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Announcement with id '{id}' was not found.");
        }

        return Ok(ApiResponse<AnnouncementResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _announcementService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Announcement with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
