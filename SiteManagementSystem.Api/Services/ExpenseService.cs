using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class ExpenseService : IExpenseService
{
    private readonly AppDbContext _dbContext;

    public ExpenseService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ExpenseResponse>> GetAllAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Expenses
            .AsNoTracking()
            .OrderByDescending(x => x.ExpenseDate)
            .Select(x => MapToResponse(x))
            .ToListAsync(cancellationToken);
    }

    public async Task<ExpenseResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Expenses
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<ExpenseResponse> CreateAsync(CreateExpenseRequest request, CancellationToken cancellationToken)
    {
        var entity = new Expense
        {
            Title = request.Title.Trim(),
            Amount = request.Amount,
            Category = request.Category.Trim(),
            ExpenseDate = request.ExpenseDate,
            InvoiceUrl = request.InvoiceUrl?.Trim() ?? string.Empty
        };

        _dbContext.Expenses.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<ExpenseResponse?> UpdateAsync(Guid id, UpdateExpenseRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Expenses.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Expense with id '{id}' was not found.");
        }

        entity.Title = request.Title.Trim();
        entity.Amount = request.Amount;
        entity.Category = request.Category.Trim();
        entity.ExpenseDate = request.ExpenseDate;
        entity.InvoiceUrl = request.InvoiceUrl?.Trim() ?? string.Empty;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(entity);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Expenses.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Expense with id '{id}' was not found.");
        }

        _dbContext.Expenses.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static ExpenseResponse MapToResponse(Expense entity) => new(
        entity.Id,
        entity.Title,
        entity.Amount,
        entity.Category,
        entity.ExpenseDate,
        entity.InvoiceUrl);
}
