using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Domain.Entities;

namespace SiteManagementSystem.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext dbContext)
    {
        var hasSites = await dbContext.Sites.AnyAsync();
        var hasAnyUser = await dbContext.Users.AnyAsync();
        var hasAdminUser = await dbContext.Users.AnyAsync(x => x.Email == "admin@site.com");

        if (hasSites && hasAnyUser)
        {
            return;
        }

        var adminUser = new User
        {
            Id = Guid.NewGuid(),
            Email = "admin@site.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            FullName = "Site Yönetim Admin",
            Phone = "+905551234567",
            Role = UserRole.ADMIN,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        if (hasSites && !hasAdminUser)
        {
            dbContext.Users.Add(adminUser);
            await dbContext.SaveChangesAsync();
            return;
        }

        if (hasSites && hasAdminUser)
        {
            return;
        }

        var site = new Site
        {
            Id = Guid.NewGuid(),
            Name = "Örnek Site",
            Address = "Merkez Mahallesi 1. Sokak",
            Phone = "+902121234567",
            Email = "site@ornek.com",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var blocks = new[]
        {
            new Block { Id = Guid.NewGuid(), Name = "A Blok", Site = site, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Block { Id = Guid.NewGuid(), Name = "B Blok", Site = site, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new Block { Id = Guid.NewGuid(), Name = "C Blok", Site = site, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow }
        };

        site.Blocks = blocks;

        var apartmentNumber = 1;
        for (var blockIndex = 0; blockIndex < blocks.Length; blockIndex++)
        {
            var block = blocks[blockIndex];
            var apartmentsToCreate = blockIndex == blocks.Length - 1 ? 84 : 83;

            for (var i = 0; i < apartmentsToCreate; i++)
            {
                var floor = (i / 10) + 1;
                block.Apartments.Add(new Apartment
                {
                    Id = Guid.NewGuid(),
                    ApartmentNumber = (apartmentNumber++).ToString(),
                    Floor = floor,
                    ApartmentType = i % 2 == 0 ? "2+1" : "1+1",
                    TapuNumber = $"TAPU-{block.Name}-{apartmentNumber}",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                });
            }
        }

        dbContext.Users.Add(adminUser);
        dbContext.Sites.Add(site);
        await dbContext.SaveChangesAsync();
    }
}
