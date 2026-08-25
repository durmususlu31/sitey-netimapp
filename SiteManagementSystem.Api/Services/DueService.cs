using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Services;

public class DueService : IDueService
{
    private readonly AppDbContext _dbContext;

    public DueService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<DueResponse>> GetAllAsync(
        Guid? apartmentId,
        Guid? siteId,
        Guid? tenantId,
        string? month,
        string? search,
        DueStatus? status,
        DueType? dueType,
        bool? isOverdue,
        string? sortBy,
        string? sortDirection,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Dues.AsNoTracking().AsQueryable();
        if (apartmentId.HasValue)
        {
            query = query.Where(x => x.ApartmentId == apartmentId.Value);
        }

        if (siteId.HasValue)
        {
            query = query.Where(x => x.Apartment.Block.SiteId == siteId.Value);
        }

        if (tenantId.HasValue)
        {
            query = query.Where(x => x.TenantId == tenantId.Value);
        }

        if (dueType.HasValue)
        {
            query = query.Where(x => x.DueType == dueType.Value);
        }

        if (!string.IsNullOrWhiteSpace(month))
        {
            query = query.Where(x => x.Period == NormalizePeriod(month));
        }

        if (status.HasValue)
        {
            query = query.Where(x => x.Status == status.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var normalizedSearch = search.Trim();
            query = query.Where(x =>
                x.Period.Contains(normalizedSearch) ||
                x.Apartment.ApartmentNumber.Contains(normalizedSearch) ||
                (x.Description != null && x.Description.Contains(normalizedSearch)));
        }

        var utcToday = DateTime.UtcNow.Date;

        if (isOverdue.HasValue)
        {
            if (isOverdue.Value)
            {
                query = query.Where(x => x.DueDate < utcToday && (x.Payments.Sum(p => (decimal?)p.AmountPaid) ?? 0m) < x.Amount);
            }
            else
            {
                query = query.Where(x => x.DueDate >= utcToday || (x.Payments.Sum(p => (decimal?)p.AmountPaid) ?? 0m) >= x.Amount);
            }
        }

        query = ApplySorting(query, sortBy, sortDirection);

        var results = await query
            .Select(x => new
            {
                x.Id,
                x.ApartmentId,
                x.TenantId,
                x.DueType,
                x.Amount,
                x.ElectricityAmount,
                x.WaterAmount,
                x.GasAmount,
                x.BillSupportAmount,
                x.Description,
                x.Period,
                x.DueDate,
                x.Status,
                TotalPaid = x.Payments.Sum(p => (decimal?)p.AmountPaid) ?? 0m
            })
            .ToListAsync(cancellationToken);

        return results
            .Select(x => MapToResponse(
                x.Id,
                x.ApartmentId,
                x.TenantId,
                x.DueType,
                x.Amount,
                x.ElectricityAmount,
                x.WaterAmount,
                x.GasAmount,
                x.BillSupportAmount,
                x.Description,
                x.Period,
                x.DueDate,
                x.Status,
                x.TotalPaid,
                utcToday))
            .ToList();
    }

    public async Task<DueResponse?> GetByIdAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Dues
            .AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == id, cancellationToken);

        if (entity is null)
        {
            return null;
        }

        var totalPaid = await _dbContext.Payments
            .Where(x => x.DueId == entity.Id)
            .SumAsync(x => (decimal?)x.AmountPaid, cancellationToken) ?? 0m;

        return MapToResponse(
            entity.Id,
            entity.ApartmentId,
            entity.TenantId,
            entity.DueType,
            entity.Amount,
            entity.ElectricityAmount,
            entity.WaterAmount,
            entity.GasAmount,
            entity.BillSupportAmount,
            entity.Description,
            entity.Period,
            entity.DueDate,
            entity.Status,
            totalPaid,
            DateTime.UtcNow.Date);
    }

    public async Task<DueResponse> CreateAsync(CreateDueRequest request, CancellationToken cancellationToken)
    {
        var normalizedPeriod = NormalizePeriod(request.Period);
        await ValidateApartmentAndUniquenessAsync(request.ApartmentId, normalizedPeriod, request.DueType, null, cancellationToken);

        var finalAmount = CalculateFinalAmount(request.DueType, request.Amount, request.ElectricityAmount, request.WaterAmount, request.GasAmount, request.BillSupportAmount);

        var entity = new Due
        {
            ApartmentId = request.ApartmentId,
            TenantId = request.TenantId,
            DueType = request.DueType,
            Amount = finalAmount,
            ElectricityAmount = request.ElectricityAmount,
            WaterAmount = request.WaterAmount,
            GasAmount = request.GasAmount,
            BillSupportAmount = request.BillSupportAmount,
            Description = request.Description?.Trim(),
            Period = normalizedPeriod,
            DueDate = request.DueDate,
            Status = request.Status
        };

        _dbContext.Dues.Add(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return MapToResponse(
            entity.Id,
            entity.ApartmentId,
            entity.TenantId,
            entity.DueType,
            entity.Amount,
            entity.ElectricityAmount,
            entity.WaterAmount,
            entity.GasAmount,
            entity.BillSupportAmount,
            entity.Description,
            entity.Period,
            entity.DueDate,
            entity.Status,
            0m,
            DateTime.UtcNow.Date);
    }

    public async Task<BulkCreateDuesResponse> BulkCreateAsync(BulkCreateDuesRequest request, CancellationToken cancellationToken)
    {
        var normalizedPeriod = NormalizePeriod(request.Period);

        // 1. Fetch targeted apartments with their active tenants
        var query = _dbContext.Apartments
            .Include(a => a.Block)
                .ThenInclude(b => b.Site)
            .Include(a => a.Tenants)
            .Where(a => a.IsActive)
            .AsQueryable();

        if (request.ApartmentIds != null && request.ApartmentIds.Count > 0)
        {
            query = query.Where(a => request.ApartmentIds.Contains(a.Id));
        }
        else if (request.BlockId.HasValue)
        {
            query = query.Where(a => a.BlockId == request.BlockId.Value);
        }
        else if (request.SiteId.HasValue)
        {
            query = query.Where(a => a.Block.SiteId == request.SiteId.Value);
        }

        var apartments = await query.ToListAsync(cancellationToken);
        if (apartments.Count == 0)
        {
            return new BulkCreateDuesResponse(0, 0, 0, new[] { "Hedef kriterlere uygun aktif daire bulunamadı." }, Array.Empty<DueResponse>());
        }

        var apartmentIds = apartments.Select(a => a.Id).ToList();

        // 2. Fetch existing dues for these apartments in this period & dueType
        var existingApartmentIds = await _dbContext.Dues
            .Where(d => apartmentIds.Contains(d.ApartmentId) && d.Period == normalizedPeriod && d.DueType == request.DueType)
            .Select(d => d.ApartmentId)
            .Distinct()
            .ToListAsync(cancellationToken);

        var existingSet = new HashSet<Guid>(existingApartmentIds);

        var newEntities = new List<Due>();
        var messages = new List<string>();
        int skippedCount = 0;

        foreach (var apt in apartments)
        {
            if (existingSet.Contains(apt.Id))
            {
                if (request.SkipDuplicates)
                {
                    skippedCount++;
                    continue;
                }
                else
                {
                    throw new DuplicateResourceException("DUPLICATE_DUE_PERIOD", $"{apt.ApartmentNumber} numaralı daire için {normalizedPeriod} döneminde {request.DueType} kaydı zaten mevcut.");
                }
            }

            var activeTenant = apt.Tenants.FirstOrDefault(t => t.IsActive);
            decimal finalAmount;

            if (string.Equals(request.AmountMode, "TENANT_DEFAULT", StringComparison.OrdinalIgnoreCase))
            {
                if (request.DueType == DueType.KIRA)
                {
                    finalAmount = activeTenant?.MonthlyRent ?? request.FixedAmount ?? 0m;
                }
                else
                {
                    finalAmount = activeTenant?.MonthlyDue ?? request.FixedAmount ?? 0m;
                }
            }
            else
            {
                finalAmount = CalculateFinalAmount(
                    request.DueType,
                    request.FixedAmount ?? 0m,
                    request.ElectricityAmount,
                    request.WaterAmount,
                    request.GasAmount,
                    request.BillSupportAmount);
            }

            var entity = new Due
            {
                ApartmentId = apt.Id,
                TenantId = activeTenant?.Id,
                DueType = request.DueType,
                Amount = finalAmount,
                ElectricityAmount = request.ElectricityAmount,
                WaterAmount = request.WaterAmount,
                GasAmount = request.GasAmount,
                BillSupportAmount = request.BillSupportAmount,
                Description = request.Description?.Trim() ?? $"{normalizedPeriod} {request.DueType}",
                Period = normalizedPeriod,
                DueDate = request.DueDate,
                Status = request.Status
            };

            newEntities.Add(entity);
        }

        if (newEntities.Count > 0)
        {
            _dbContext.Dues.AddRange(newEntities);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        messages.Add($"{apartments.Count} hedef daireden {newEntities.Count} adedine başarıyla tahakkuk oluşturuldu.");
        if (skippedCount > 0)
        {
            messages.Add($"{skippedCount} dairede daha önce oluşturulmuş tahakkuk bulunduğu için atlandı.");
        }

        var utcToday = DateTime.UtcNow.Date;
        var createdResponses = newEntities.Select(e => MapToResponse(
            e.Id,
            e.ApartmentId,
            e.TenantId,
            e.DueType,
            e.Amount,
            e.ElectricityAmount,
            e.WaterAmount,
            e.GasAmount,
            e.BillSupportAmount,
            e.Description,
            e.Period,
            e.DueDate,
            e.Status,
            0m,
            utcToday)).ToList();

        return new BulkCreateDuesResponse(apartments.Count, newEntities.Count, skippedCount, messages, createdResponses);
    }

    public async Task<BulkImportResultResponse> ImportDuesAsync(IReadOnlyList<BulkImportDueRowRequest> rows, CancellationToken cancellationToken)
    {
        if (rows == null || rows.Count == 0)
        {
            return new BulkImportResultResponse(0, 0, 0, 0, new[] { "İçe aktarılacak satır bulunamadı." }, Array.Empty<DueResponse>());
        }

        var apartments = await _dbContext.Apartments
            .Include(a => a.Block)
                .ThenInclude(b => b.Site)
            .Include(a => a.Tenants)
            .Where(a => a.IsActive)
            .ToListAsync(cancellationToken);

        var newEntities = new List<Due>();
        var logs = new List<string>();
        int successCount = 0;
        int skippedCount = 0;
        int errorCount = 0;

        foreach (var (row, index) in rows.Select((r, i) => (r, i + 1)))
        {
            try
            {
                if (string.IsNullOrWhiteSpace(row.ApartmentNumber))
                {
                    errorCount++;
                    logs.Add($"Satır {index}: Daire numarası boş olamaz.");
                    continue;
                }

                var matched = apartments.Where(a =>
                    string.Equals(a.ApartmentNumber.Trim(), row.ApartmentNumber.Trim(), StringComparison.OrdinalIgnoreCase));

                if (!string.IsNullOrWhiteSpace(row.BlockName))
                {
                    matched = matched.Where(a => string.Equals(a.Block.Name.Trim(), row.BlockName.Trim(), StringComparison.OrdinalIgnoreCase));
                }

                if (!string.IsNullOrWhiteSpace(row.SiteName))
                {
                    matched = matched.Where(a => string.Equals(a.Block.Site.Name.Trim(), row.SiteName.Trim(), StringComparison.OrdinalIgnoreCase));
                }

                var aptList = matched.ToList();
                if (aptList.Count == 0)
                {
                    errorCount++;
                    logs.Add($"Satır {index}: {row.SiteName} / {row.BlockName} / Daire {row.ApartmentNumber} bulunamadı.");
                    continue;
                }

                var apartment = aptList.First();
                var normalizedPeriod = NormalizePeriod(row.Period);

                var exists = await _dbContext.Dues.AnyAsync(
                    d => d.ApartmentId == apartment.Id && d.Period == normalizedPeriod && d.DueType == row.DueType,
                    cancellationToken);

                if (exists)
                {
                    skippedCount++;
                    logs.Add($"Satır {index}: Daire {apartment.ApartmentNumber} için {normalizedPeriod} {row.DueType} zaten mevcut, atlandı.");
                    continue;
                }

                var activeTenant = apartment.Tenants.FirstOrDefault(t => t.IsActive);
                var finalAmount = CalculateFinalAmount(
                    row.DueType,
                    row.Amount ?? 0m,
                    row.ElectricityAmount,
                    row.WaterAmount,
                    row.GasAmount,
                    row.BillSupportAmount);

                var entity = new Due
                {
                    ApartmentId = apartment.Id,
                    TenantId = activeTenant?.Id,
                    DueType = row.DueType,
                    Amount = finalAmount,
                    ElectricityAmount = row.ElectricityAmount,
                    WaterAmount = row.WaterAmount,
                    GasAmount = row.GasAmount,
                    BillSupportAmount = row.BillSupportAmount,
                    Description = row.Description?.Trim() ?? $"{normalizedPeriod} {row.DueType}",
                    Period = normalizedPeriod,
                    DueDate = row.DueDate,
                    Status = DueStatus.PENDING
                };

                newEntities.Add(entity);
                successCount++;
            }
            catch (Exception ex)
            {
                errorCount++;
                logs.Add($"Satır {index}: Hata oluştu ({ex.Message})");
            }
        }

        if (newEntities.Count > 0)
        {
            _dbContext.Dues.AddRange(newEntities);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var utcToday = DateTime.UtcNow.Date;
        var importedResponses = newEntities.Select(e => MapToResponse(
            e.Id,
            e.ApartmentId,
            e.TenantId,
            e.DueType,
            e.Amount,
            e.ElectricityAmount,
            e.WaterAmount,
            e.GasAmount,
            e.BillSupportAmount,
            e.Description,
            e.Period,
            e.DueDate,
            e.Status,
            0m,
            utcToday)).ToList();

        logs.Insert(0, $"Toplam {rows.Count} satır işlendi: {successCount} başarılı, {skippedCount} mükerrer atlandı, {errorCount} hatalı.");
        return new BulkImportResultResponse(rows.Count, successCount, skippedCount, errorCount, logs, importedResponses);
    }


    public async Task<DueResponse?> UpdateAsync(Guid id, UpdateDueRequest request, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Dues.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Due with id '{id}' was not found.");
        }

        var normalizedPeriod = NormalizePeriod(request.Period);
        await ValidateApartmentAndUniquenessAsync(request.ApartmentId, normalizedPeriod, request.DueType, id, cancellationToken);

        var finalAmount = CalculateFinalAmount(request.DueType, request.Amount, request.ElectricityAmount, request.WaterAmount, request.GasAmount, request.BillSupportAmount);

        entity.ApartmentId = request.ApartmentId;
        entity.TenantId = request.TenantId;
        entity.DueType = request.DueType;
        entity.Amount = finalAmount;
        entity.ElectricityAmount = request.ElectricityAmount;
        entity.WaterAmount = request.WaterAmount;
        entity.GasAmount = request.GasAmount;
        entity.BillSupportAmount = request.BillSupportAmount;
        entity.Description = request.Description?.Trim();
        entity.Period = normalizedPeriod;
        entity.DueDate = request.DueDate;
        entity.Status = request.Status;

        await _dbContext.SaveChangesAsync(cancellationToken);
        var totalPaid = await _dbContext.Payments
            .Where(x => x.DueId == entity.Id)
            .SumAsync(x => (decimal?)x.AmountPaid, cancellationToken) ?? 0m;

        return MapToResponse(
            entity.Id,
            entity.ApartmentId,
            entity.TenantId,
            entity.DueType,
            entity.Amount,
            entity.ElectricityAmount,
            entity.WaterAmount,
            entity.GasAmount,
            entity.BillSupportAmount,
            entity.Description,
            entity.Period,
            entity.DueDate,
            entity.Status,
            totalPaid,
            DateTime.UtcNow.Date);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _dbContext.Dues.SingleOrDefaultAsync(x => x.Id == id, cancellationToken);
        if (entity is null)
        {
            throw new ResourceNotFoundException($"Due with id '{id}' was not found.");
        }

        _dbContext.Dues.Remove(entity);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    private static decimal CalculateFinalAmount(
        DueType dueType,
        decimal providedAmount,
        decimal? electricity,
        decimal? water,
        decimal? gas,
        decimal? billSupport)
    {
        if (dueType == DueType.FATURA && (electricity.HasValue || water.HasValue || gas.HasValue))
        {
            var gross = (electricity ?? 0m) + (water ?? 0m) + (gas ?? 0m);
            var support = billSupport ?? 0m;
            return Math.Max(0m, gross - support);
        }

        return providedAmount;
    }

    private async Task ValidateApartmentAndUniquenessAsync(Guid apartmentId, string period, DueType dueType, Guid? dueId, CancellationToken cancellationToken)
    {
        var apartmentExists = await _dbContext.Apartments.AnyAsync(x => x.Id == apartmentId, cancellationToken);
        if (!apartmentExists)
        {
            throw new ResourceNotFoundException($"Apartment with id '{apartmentId}' was not found.");
        }

        var normalizedPeriod = NormalizePeriod(period);
        var duplicateExists = await _dbContext.Dues.AnyAsync(
            x => x.ApartmentId == apartmentId && x.Period == normalizedPeriod && x.DueType == dueType && (!dueId.HasValue || x.Id != dueId.Value),
            cancellationToken);

        if (duplicateExists)
        {
            throw new DuplicateResourceException("DUPLICATE_DUE_PERIOD", $"A {dueType} record for this apartment and period already exists.");
        }
    }

    private static string NormalizePeriod(string? value)
    {
        var normalized = value?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(normalized))
        {
            throw new ArgumentException("Due period is required.", nameof(value));
        }

        if (!Regex.IsMatch(normalized, "^\\d{4}-(0[1-9]|1[0-2])$"))
        {
            throw new ArgumentException("Due period must be in YYYY-MM format.", nameof(value));
        }

        return normalized;
    }

    private static IQueryable<Due> ApplySorting(IQueryable<Due> query, string? sortBy, string? sortDirection)
    {
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var normalizedSort = sortBy?.Trim().ToLowerInvariant();

        return normalizedSort switch
        {
            "amount" => descending ? query.OrderByDescending(x => x.Amount) : query.OrderBy(x => x.Amount),
            "period" => descending ? query.OrderByDescending(x => x.Period) : query.OrderBy(x => x.Period),
            "duetype" => descending ? query.OrderByDescending(x => x.DueType) : query.OrderBy(x => x.DueType),
            "remainingamount" => descending
                ? query.OrderByDescending(x => x.Amount - (x.Payments.Sum(p => (decimal?)p.AmountPaid) ?? 0m))
                : query.OrderBy(x => x.Amount - (x.Payments.Sum(p => (decimal?)p.AmountPaid) ?? 0m)),
            _ => descending ? query.OrderByDescending(x => x.DueDate) : query.OrderBy(x => x.DueDate)
        };
    }

    private static DueResponse MapToResponse(
        Guid id,
        Guid apartmentId,
        Guid? tenantId,
        DueType dueType,
        decimal amount,
        decimal? electricityAmount,
        decimal? waterAmount,
        decimal? gasAmount,
        decimal? billSupportAmount,
        string? description,
        string period,
        DateTime dueDate,
        DueStatus status,
        decimal totalPaid,
        DateTime utcToday)
    {
        var remainingAmount = Math.Max(0m, amount - totalPaid);
        var isOverdue = dueDate.Date < utcToday && remainingAmount > 0;
        var daysOverdue = isOverdue ? (utcToday - dueDate.Date).Days : 0;
        var grossAmount = (dueType == DueType.FATURA && (electricityAmount.HasValue || waterAmount.HasValue || gasAmount.HasValue))
            ? ((electricityAmount ?? 0m) + (waterAmount ?? 0m) + (gasAmount ?? 0m))
            : (amount + (billSupportAmount ?? 0m));

        return new DueResponse(
            id,
            apartmentId,
            amount,
            period,
            dueDate,
            status,
            dueType,
            tenantId,
            electricityAmount,
            waterAmount,
            gasAmount,
            billSupportAmount,
            grossAmount,
            description,
            totalPaid,
            remainingAmount,
            isOverdue,
            daysOverdue);
    }
}
