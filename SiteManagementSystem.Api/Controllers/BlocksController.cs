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
public class BlocksController : ControllerBase
{
    private readonly IBlockService _blockService;
    private readonly IApartmentService _apartmentService;

    public BlocksController(IBlockService blockService, IApartmentService apartmentService)
    {
        _blockService = blockService;
        _apartmentService = apartmentService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] Guid? siteId, CancellationToken cancellationToken)
    {
        var blocks = await _blockService.GetAllAsync(siteId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BlockResponse>>.Ok(blocks));
    }

    [HttpGet("{blockId:guid}/apartments")]
    public async Task<IActionResult> GetApartments(
        Guid blockId,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        var apartments = await _apartmentService.GetAllAsync(blockId, search, pageNumber, pageSize, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<ApartmentResponse>>.Ok(apartments));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var block = await _blockService.GetByIdAsync(id, cancellationToken);
        if (block is null)
        {
            throw new ResourceNotFoundException($"Block with id '{id}' was not found.");
        }

        return Ok(ApiResponse<BlockResponse>.Ok(block));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBlockRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreateBlockRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _blockService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<BlockResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateBlockRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdateBlockRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _blockService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Block with id '{id}' was not found.");
        }

        return Ok(ApiResponse<BlockResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _blockService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Block with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }

    [HttpDelete("{blockId:guid}/apartments/{apartmentId:guid}")]
    public async Task<IActionResult> DeleteApartment(Guid blockId, Guid apartmentId, CancellationToken cancellationToken)
    {
        var apartment = await _apartmentService.GetByIdAsync(apartmentId, cancellationToken);
        if (apartment is null || apartment.BlockId != blockId)
        {
            throw new ResourceNotFoundException($"Apartment with id '{apartmentId}' was not found for block '{blockId}'.");
        }

        var deleted = await _apartmentService.DeleteAsync(apartmentId, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Apartment with id '{apartmentId}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
