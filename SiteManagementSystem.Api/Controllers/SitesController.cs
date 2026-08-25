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
public class SitesController : ControllerBase
{
    private readonly ISiteService _siteService;
    private readonly IBlockService _blockService;

    public SitesController(ISiteService siteService, IBlockService blockService)
    {
        _siteService = siteService;
        _blockService = blockService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDirection,
        CancellationToken cancellationToken)
    {
        var sites = await _siteService.GetAllAsync(search, sortBy, sortDirection, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<SiteResponse>>.Ok(sites));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var site = await _siteService.GetByIdAsync(id, cancellationToken);
        if (site is null)
        {
            throw new ResourceNotFoundException($"Site with id '{id}' was not found.");
        }

        return Ok(ApiResponse<SiteResponse>.Ok(site));
    }

    [HttpGet("{siteId:guid}/blocks")]
    public async Task<IActionResult> GetBlocks(Guid siteId, CancellationToken cancellationToken)
    {
        var blocks = await _siteService.GetBlocksBySiteIdAsync(siteId, cancellationToken);
        return Ok(ApiResponse<IReadOnlyList<BlockResponse>>.Ok(blocks));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSiteRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new CreateSiteRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _siteService.CreateAsync(request, cancellationToken);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, ApiResponse<SiteResponse>.Ok(created));
    }

    [HttpPost("{siteId:guid}/blocks")]
    public async Task<IActionResult> CreateBlock(Guid siteId, [FromBody] CreateBlockRequest request, CancellationToken cancellationToken)
    {
        var siteScopedRequest = request with { SiteId = siteId };
        var validationResult = new CreateBlockRequestValidator().Validate(siteScopedRequest);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var created = await _blockService.CreateAsync(siteScopedRequest, cancellationToken);
        return CreatedAtAction(nameof(GetBlocks), new { siteId }, ApiResponse<BlockResponse>.Ok(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateSiteRequest request, CancellationToken cancellationToken)
    {
        var validationResult = new UpdateSiteRequestValidator().Validate(request);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _siteService.UpdateAsync(id, request, cancellationToken);
        if (updated is null)
        {
            throw new ResourceNotFoundException($"Site with id '{id}' was not found.");
        }

        return Ok(ApiResponse<SiteResponse>.Ok(updated));
    }

    [HttpPut("{siteId:guid}/blocks/{blockId:guid}")]
    public async Task<IActionResult> UpdateBlock(Guid siteId, Guid blockId, [FromBody] UpdateBlockRequest request, CancellationToken cancellationToken)
    {
        var siteScopedRequest = request with { SiteId = siteId };
        var validationResult = new UpdateBlockRequestValidator().Validate(siteScopedRequest);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors);
        }

        var updated = await _blockService.UpdateAsync(blockId, siteScopedRequest, cancellationToken);
        if (updated is null || updated.SiteId != siteId)
        {
            throw new ResourceNotFoundException($"Block with id '{blockId}' was not found for site '{siteId}'.");
        }

        return Ok(ApiResponse<BlockResponse>.Ok(updated));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var deleted = await _siteService.DeleteAsync(id, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Site with id '{id}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }

    [HttpDelete("{siteId:guid}/blocks/{blockId:guid}")]
    public async Task<IActionResult> DeleteBlock(Guid siteId, Guid blockId, CancellationToken cancellationToken)
    {
        var block = await _siteService.GetBlockByIdAsync(blockId, cancellationToken);
        if (block is null || block.SiteId != siteId)
        {
            throw new ResourceNotFoundException($"Block with id '{blockId}' was not found for site '{siteId}'.");
        }

        var deleted = await _siteService.DeleteBlockAsync(blockId, cancellationToken);
        if (!deleted)
        {
            throw new ResourceNotFoundException($"Block with id '{blockId}' was not found.");
        }

        return Ok(ApiResponse<object>.Ok(new { deleted = true }));
    }
}
