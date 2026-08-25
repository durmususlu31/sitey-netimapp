using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Services;

public class ReportingService : IReportingService
{
    private readonly AppDbContext _dbContext;

    public ReportingService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<FinanceReportResponse> GetFinanceReportAsync(CancellationToken cancellationToken)
    {
        var utcToday = DateTime.UtcNow.Date;
        var currentMonth = new DateTime(utcToday.Year, utcToday.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var firstMonth = currentMonth.AddMonths(-5);

        var dues = await _dbContext.Dues
            .AsNoTracking()
            .Select(x => new
            {
                x.Id,
                x.ApartmentId,
                ApartmentNumber = x.Apartment.ApartmentNumber,
                SiteName = x.Apartment.Block.Site.Name,
                x.Amount,
                x.DueDate,
                TotalPaid = x.Payments.Sum(p => (decimal?)p.AmountPaid) ?? 0m
            })
            .ToListAsync(cancellationToken);

        var payments = await _dbContext.Payments
            .AsNoTracking()
            .Where(x => x.PaymentDate >= firstMonth)
            .Select(x => new
            {
                x.PaymentDate,
                x.AmountPaid
            })
            .ToListAsync(cancellationToken);

        var expenses = await _dbContext.Expenses
            .AsNoTracking()
            .Where(x => x.ExpenseDate >= firstMonth)
            .Select(x => new
            {
                x.ExpenseDate,
                x.Amount
            })
            .ToListAsync(cancellationToken);

        var totalDues = dues.Sum(x => x.Amount);
        var totalCollected = dues.Sum(x => Math.Min(x.TotalPaid, x.Amount));
        var outstandingAmount = dues.Sum(x => Math.Max(0m, x.Amount - x.TotalPaid));
        var paidCount = dues.Count(x => x.TotalPaid >= x.Amount);
        var overdueDues = dues
            .Where(x => x.DueDate.Date < utcToday && x.TotalPaid < x.Amount)
            .Select(x => new
            {
                x.Id,
                x.ApartmentId,
                x.ApartmentNumber,
                x.SiteName,
                x.Amount,
                RemainingAmount = Math.Max(0m, x.Amount - x.TotalPaid),
                DaysOverdue = (utcToday - x.DueDate.Date).Days
            })
            .OrderByDescending(x => x.DaysOverdue)
            .ThenByDescending(x => x.RemainingAmount)
            .ToList();

        var pendingCount = dues.Count - paidCount;

        var monthlyCollections = BuildMonthlyTrend(firstMonth, currentMonth, payments, x => x.PaymentDate, x => x.AmountPaid);
        var monthlyExpenses = BuildMonthlyTrend(firstMonth, currentMonth, expenses, x => x.ExpenseDate, x => x.Amount);

        return new FinanceReportResponse(
            totalDues,
            totalCollected,
            outstandingAmount,
            overdueDues.Count,
            paidCount,
            pendingCount,
            monthlyCollections,
            monthlyExpenses,
            overdueDues
                .Take(5)
                .Select(x => new OverdueDueSummaryResponse(
                    x.Id,
                    x.ApartmentId,
                    x.ApartmentNumber,
                    x.SiteName,
                    x.Amount,
                    x.RemainingAmount,
                    x.DaysOverdue))
                .ToList());
    }

    private static IReadOnlyList<FinanceTrendPointResponse> BuildMonthlyTrend<T>(
        DateTime firstMonth,
        DateTime currentMonth,
        IEnumerable<T> values,
        Func<T, DateTime> dateSelector,
        Func<T, decimal> amountSelector)
    {
        var totals = values
            .GroupBy(x => new DateTime(dateSelector(x).Year, dateSelector(x).Month, 1, 0, 0, 0, DateTimeKind.Utc))
            .ToDictionary(x => x.Key, x => x.Sum(amountSelector));

        var points = new List<FinanceTrendPointResponse>();
        for (var month = firstMonth; month <= currentMonth; month = month.AddMonths(1))
        {
            totals.TryGetValue(month, out var amount);
            points.Add(new FinanceTrendPointResponse(month.ToString("yyyy-MM"), amount));
        }

        return points;
    }
}
