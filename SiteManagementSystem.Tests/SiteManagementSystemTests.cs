using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.DTOs;
using SiteManagementSystem.Api.Infrastructure;
using SiteManagementSystem.Api.Services;

namespace SiteManagementSystem.Tests;

public class SiteManagementSystemTests
{
    private static AppDbContext CreateDbContext()
    {
        var connection = new SqliteConnection("DataSource=:memory:");
        connection.Open();

        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;

        var dbContext = new AppDbContext(options);
        dbContext.Database.EnsureCreated();
        return dbContext;
    }

    [Fact]
    public async Task CreateSite_ShouldCreateSite()
    {
        await using var dbContext = CreateDbContext();
        var service = new SiteService(dbContext);

        var result = await service.CreateAsync(new CreateSiteRequest("Site A", "Address 1", "123456", "admin@example.com"), CancellationToken.None);

        Assert.Equal("Site A", result.Name);
        Assert.NotEqual(Guid.Empty, result.Id);
    }

    [Fact]
    public async Task GetSite_ShouldReturnSavedSite()
    {
        await using var dbContext = CreateDbContext();
        var service = new SiteService(dbContext);
        var created = await service.CreateAsync(new CreateSiteRequest("Site B", "Address 2", "123456", "admin2@example.com"), CancellationToken.None);

        var result = await service.GetByIdAsync(created.Id, CancellationToken.None);

        Assert.NotNull(result);
        Assert.Equal("Site B", result!.Name);
    }

    [Fact]
    public async Task UpdateSite_ShouldUpdateDetails()
    {
        await using var dbContext = CreateDbContext();
        var service = new SiteService(dbContext);
        var created = await service.CreateAsync(new CreateSiteRequest("Old Name", "Old Address", "111", "old@example.com"), CancellationToken.None);

        var updated = await service.UpdateAsync(created.Id, new UpdateSiteRequest("New Name", "New Address", "222", "new@example.com"), CancellationToken.None);

        Assert.NotNull(updated);
        Assert.Equal("New Name", updated!.Name);
        Assert.Equal("New Address", updated.Address);
    }

    [Fact]
    public async Task DeleteSite_ShouldRemoveSite()
    {
        await using var dbContext = CreateDbContext();
        var service = new SiteService(dbContext);
        var created = await service.CreateAsync(new CreateSiteRequest("Delete Me", "Address", "123", "delete@example.com"), CancellationToken.None);

        var deleted = await service.DeleteAsync(created.Id, CancellationToken.None);
        var getResult = await service.GetByIdAsync(created.Id, CancellationToken.None);

        Assert.True(deleted);
        Assert.Null(getResult);
    }

    [Fact]
    public async Task CreateBlock_ShouldCreateBlock()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site C", "Address", "123", "sitec@example.com"), CancellationToken.None);
        var service = new BlockService(dbContext);

        var result = await service.CreateAsync(new CreateBlockRequest(site.Id, "A Blok"), CancellationToken.None);

        Assert.Equal("A Blok", result.Name);
    }

    [Fact]
    public async Task CreateDuplicateBlockInSameSite_ShouldThrowDuplicateResourceException()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site D", "Address", "123", "sited@example.com"), CancellationToken.None);
        var service = new BlockService(dbContext);
        await service.CreateAsync(new CreateBlockRequest(site.Id, "Dup Block"), CancellationToken.None);

        await Assert.ThrowsAsync<DuplicateResourceException>(() => service.CreateAsync(new CreateBlockRequest(site.Id, "Dup Block"), CancellationToken.None));
    }

    [Fact]
    public async Task CreateApartment_ShouldCreateApartment()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site E", "Address", "123", "sitee@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block E"), CancellationToken.None);
        var service = new ApartmentService(dbContext);

        var result = await service.CreateAsync(new CreateApartmentRequest(block.Id, null, null, "10", 3, "2+1", "TAPU-001", true), CancellationToken.None);

        Assert.Equal("10", result.ApartmentNumber);
        Assert.Equal(block.Id, result.BlockId);
    }

    [Fact]
    public async Task CreateDuplicateApartmentInSameBlock_ShouldThrowDuplicateResourceException()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site F", "Address", "123", "sitef@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block F"), CancellationToken.None);
        var service = new ApartmentService(dbContext);
        await service.CreateAsync(new CreateApartmentRequest(block.Id, null, null, "20", 2, "1+1", "TAPU-002", true), CancellationToken.None);

        await Assert.ThrowsAsync<DuplicateResourceException>(() => service.CreateAsync(new CreateApartmentRequest(block.Id, null, null, "20", 2, "1+1", "TAPU-003", true), CancellationToken.None));
    }

    [Fact]
    public async Task GetApartmentsByBlock_ShouldReturnMatchingApartments()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site G", "Address", "123", "siteg@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block G"), CancellationToken.None);
        var service = new ApartmentService(dbContext);
        await service.CreateAsync(new CreateApartmentRequest(block.Id, null, null, "1", 1, "1+1", "TAPU-11", true), CancellationToken.None);
        await service.CreateAsync(new CreateApartmentRequest(block.Id, null, null, "2", 2, "2+1", "TAPU-12", true), CancellationToken.None);

        var result = await service.GetAllAsync(block.Id, null, 1, 50, CancellationToken.None);

        Assert.Equal(2, result.Count);
        Assert.All(result, apartment => Assert.Equal(block.Id, apartment.BlockId));
    }

    [Fact]
    public async Task SearchApartments_ShouldReturnMatchesByApartmentNumberOrTapu()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site H", "Address", "123", "siteh@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block H"), CancellationToken.None);
        var service = new ApartmentService(dbContext);
        await service.CreateAsync(new CreateApartmentRequest(block.Id, null, null, "101", 10, "3+1", "TAPU-ALPHA", true), CancellationToken.None);
        await service.CreateAsync(new CreateApartmentRequest(block.Id, null, null, "202", 20, "2+1", "TAPU-BETA", true), CancellationToken.None);

        var result = await service.GetAllAsync(null, "ALPHA", 1, 50, CancellationToken.None);

        Assert.Single(result);
        Assert.Equal("101", result[0].ApartmentNumber);
    }

    [Fact]
    public async Task CreateOwner_ShouldCreateOwner()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site I", "Address", "123", "sitei@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block I"), CancellationToken.None);
        var apartment = await new ApartmentService(dbContext).CreateAsync(new CreateApartmentRequest(block.Id, null, null, "12", 2, "2+1", "TAPU-OWNER", true), CancellationToken.None);
        var service = new OwnerService(dbContext);

        var result = await service.CreateAsync(new CreateOwnerRequest(apartment.Id, "Jane Owner", "5551112233", "jane@example.com", "ID-100", true), CancellationToken.None);

        Assert.Equal("Jane Owner", result.FullName);
        Assert.Equal(apartment.Id, result.ApartmentId);
    }

    [Fact]
    public async Task CreateDuplicateOwnerInSameApartment_ShouldThrowDuplicateResourceException()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site J", "Address", "123", "sitej@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block J"), CancellationToken.None);
        var apartment = await new ApartmentService(dbContext).CreateAsync(new CreateApartmentRequest(block.Id, null, null, "13", 3, "3+1", "TAPU-OWNER-DUP", true), CancellationToken.None);
        var service = new OwnerService(dbContext);
        await service.CreateAsync(new CreateOwnerRequest(apartment.Id, "Duplicate Owner", "5551112233", "dup@example.com", "ID-200", true), CancellationToken.None);

        await Assert.ThrowsAsync<DuplicateResourceException>(() => service.CreateAsync(new CreateOwnerRequest(apartment.Id, "Duplicate Owner", "5551112234", "dup2@example.com", "ID-201", true), CancellationToken.None));
    }

    [Fact]
    public async Task CreateTenant_ShouldCreateTenant()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site K", "Address", "123", "sitek@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block K"), CancellationToken.None);
        var apartment = await new ApartmentService(dbContext).CreateAsync(new CreateApartmentRequest(block.Id, null, null, "14", 4, "1+1", "TAPU-TENANT", true), CancellationToken.None);
        var service = new TenantService(dbContext);

        var result = await service.CreateAsync(new CreateTenantRequest(apartment.Id, "John Tenant", "5554445566", "john@example.com", "ID-300", DateTime.UtcNow.AddDays(-10), null, true), CancellationToken.None);

        Assert.Equal("John Tenant", result.FullName);
        Assert.Equal(apartment.Id, result.ApartmentId);
    }

    [Fact]
    public async Task CreateDuplicateTenantInSameApartment_ShouldThrowDuplicateResourceException()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site L", "Address", "123", "sitel@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block L"), CancellationToken.None);
        var apartment = await new ApartmentService(dbContext).CreateAsync(new CreateApartmentRequest(block.Id, null, null, "15", 5, "2+1", "TAPU-TENANT-DUP", true), CancellationToken.None);
        var service = new TenantService(dbContext);
        await service.CreateAsync(new CreateTenantRequest(apartment.Id, "Duplicate Tenant", "5554445566", "tenant@example.com", "ID-400", DateTime.UtcNow.AddDays(-20), null, true), CancellationToken.None);

        await Assert.ThrowsAsync<DuplicateResourceException>(() => service.CreateAsync(new CreateTenantRequest(apartment.Id, "Duplicate Tenant", "5554445567", "tenant2@example.com", "ID-401", DateTime.UtcNow.AddDays(-15), null, true), CancellationToken.None));
    }

    [Fact]
    public async Task CreateDueAndRentAndBill_ForSameApartmentAndMonth_ShouldSucceed()
    {
        await using var dbContext = CreateDbContext();
        var site = await new SiteService(dbContext).CreateAsync(new CreateSiteRequest("Site Multi", "Address", "123", "multi@example.com"), CancellationToken.None);
        var block = await new BlockService(dbContext).CreateAsync(new CreateBlockRequest(site.Id, "Block M"), CancellationToken.None);
        var apartment = await new ApartmentService(dbContext).CreateAsync(new CreateApartmentRequest(block.Id, null, null, "101", 1, "2+1", "TP-M", true), CancellationToken.None);
        var dueService = new DueService(dbContext);

        var due = await dueService.CreateAsync(new CreateDueRequest(apartment.Id, 2000m, "2026-08", DateTime.UtcNow.AddDays(10), DueStatus.PENDING, DueType.AIDAT), CancellationToken.None);
        var rent = await dueService.CreateAsync(new CreateDueRequest(apartment.Id, 22000m, "2026-08", DateTime.UtcNow.AddDays(10), DueStatus.PENDING, DueType.KIRA), CancellationToken.None);
        var bill = await dueService.CreateAsync(new CreateDueRequest(
            apartment.Id,
            0m,
            "2026-08",
            DateTime.UtcNow.AddDays(10),
            DueStatus.PENDING,
            DueType.FATURA,
            null,
            1200m, // Electricity
            500m,  // Water
            800m,  // Gas
            2000m, // Bill Support
            "Ağustos Faturaları"), CancellationToken.None);

        Assert.Equal(2000m, due.Amount);
        Assert.Equal(22000m, rent.Amount);
        Assert.Equal(500m, bill.Amount); // 2500 - 2000 = 500
        Assert.Equal(2500m, bill.GrossAmount);
        Assert.Equal(2000m, bill.BillSupportAmount);
    }
}
