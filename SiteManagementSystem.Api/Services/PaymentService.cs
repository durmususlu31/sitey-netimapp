using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class PaymentService : IPaymentService
{
    private readonly AppDbContext _dbContext;

    public PaymentService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<PaymentResponse>> GetAllAsync(Guid? dueId, CancellationToken cancellationToken)
    {
        var query = _dbContext.Payments.AsNoTracking().AsQueryable();
        if (dueId.HasValue)
        {
            query = query.Where(x => x.DueId == dueId.Value);
        }

        return await query
            .OrderByDescending(x => x.PaymentDate)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<PaymentResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Payments
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<PaymentResponse> CreateAsync(CreatePaymentRequest request, CancellationToken cancellationToken)
    {
        await EnsureDueExistsAsync(request.DueId, cancellationToken);

        var entity = new Payment
        {
            DueId = request.DueId,
            AmountPaid = request.AmountPaid,
            PaymentDate = request.PaymentDate,
            PaymentMethod = request.PaymentMethod.Trim()
        };

        _dbContext.Payments.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<PaymentResponse?> UpdateAsync(Guid id, UpdatePaymentRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Payments.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Payment with id '{id}' was not found.");
        }

        await EnsureDueExistsAsync(request.DueId, cancellationToken);

        entity.DueId = request.DueId;
        entity.AmountPaid = request.AmountPaid;
        entity.PaymentDate = request.PaymentDate;
        entity.PaymentMethod = request.PaymentMethod.Trim();

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Payments.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Payment with id '{id}' was not found.");
        }

        _dbContext.Payments.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private async Task EnsureDueExistsAsync(Guid dueId, CancellationToken cancellationToken)
    {
        var dueExists = await _dbContext.Dues.AnyAsync(x => x.Id == dueId, cancellationToken);
        if (!dueExists)
        {
            throw new ResourceNotFoundException($"Due with id '{dueId}' was not found.");
        }
    }

    private static PaymentResponse MapToResponse(Payment entity) => new(
        entity.Id,
        entity.DueId,
        entity.AmountPaid,
        entity.PaymentDate,
        entity.PaymentMethod);
}
