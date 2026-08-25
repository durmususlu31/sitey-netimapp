using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Domain.Entities;

namespace SiteManagementSystem.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Site> Sites => Set<Site>();
    public DbSet<Block> Blocks => Set<Block>();
    public DbSet<Apartment> Apartments => Set<Apartment>();
    public DbSet<Owner> Owners => Set<Owner>();
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Due> Dues => Set<Due>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Announcement> Announcements => Set<Announcement>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PropertyDocument> PropertyDocuments => Set<PropertyDocument>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Site>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.Name).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Address).HasMaxLength(500);
            entity.Property(x => x.Phone).HasMaxLength(50);
            entity.Property(x => x.Email).HasMaxLength(200);
            entity.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<Block>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.Name).IsRequired().HasMaxLength(150);
            entity.HasIndex(x => new { x.SiteId, x.Name }).IsUnique();
            entity.HasOne(x => x.Site)
                .WithMany(x => x.Blocks)
                .HasForeignKey(x => x.SiteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Apartment>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.ApartmentNumber).IsRequired().HasMaxLength(50);
            entity.Property(x => x.Floor).IsRequired();
            entity.Property(x => x.ApartmentType).HasMaxLength(100);
            entity.Property(x => x.TapuNumber).HasMaxLength(100);
            entity.HasIndex(x => new { x.BlockId, x.ApartmentNumber }).IsUnique();
            entity.HasOne(x => x.Block)
                .WithMany(x => x.Apartments)
                .HasForeignKey(x => x.BlockId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Owner)
                .WithMany(x => x.OwnedApartments)
                .HasForeignKey(x => x.OwnerId)
                .OnDelete(DeleteBehavior.SetNull);
            entity.HasOne(x => x.Resident)
                .WithMany(x => x.ResidentApartments)
                .HasForeignKey(x => x.ResidentId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Owner>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.FullName).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Phone).HasMaxLength(50);
            entity.Property(x => x.Email).HasMaxLength(200);
            entity.Property(x => x.IdNumber).HasMaxLength(100);
            entity.HasIndex(x => new { x.ApartmentId, x.FullName }).IsUnique();
            entity.HasOne(x => x.Apartment)
                .WithMany(x => x.Owners)
                .HasForeignKey(x => x.ApartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Tenant>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.FullName).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Phone).HasMaxLength(50);
            entity.Property(x => x.Email).HasMaxLength(200);
            entity.Property(x => x.IdNumber).HasMaxLength(100);
            entity.Property(x => x.MonthlyRent).HasColumnType("numeric(18,2)");
            entity.Property(x => x.MonthlyDue).HasColumnType("numeric(18,2)");
            entity.Property(x => x.DefaultBillSupport).HasColumnType("numeric(18,2)");
            entity.HasIndex(x => new { x.ApartmentId, x.FullName }).IsUnique();
            entity.HasOne(x => x.Apartment)
                .WithMany(x => x.Tenants)
                .HasForeignKey(x => x.ApartmentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.Email).IsRequired().HasMaxLength(200);
            entity.Property(x => x.PasswordHash).IsRequired().HasMaxLength(500);
            entity.Property(x => x.FullName).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Phone).HasMaxLength(50);
            entity.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
            entity.Property(x => x.CreatedAt).IsRequired();
            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<Due>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.DueType).HasConversion<string>().HasMaxLength(20);
            entity.Property(x => x.Amount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.ElectricityAmount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.WaterAmount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.GasAmount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.BillSupportAmount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.Description).HasMaxLength(500);
            entity.Property(x => x.Period).IsRequired().HasMaxLength(20);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            entity.HasIndex(x => new { x.ApartmentId, x.Period, x.DueType }).IsUnique();
            entity.HasOne(x => x.Apartment)
                .WithMany(x => x.Dues)
                .HasForeignKey(x => x.ApartmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(x => x.Tenant)
                .WithMany(x => x.Dues)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Payment>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.AmountPaid).HasColumnType("numeric(18,2)");
            entity.Property(x => x.PaymentMethod).IsRequired().HasMaxLength(50);
            entity.HasOne(x => x.Due)
                .WithMany(x => x.Payments)
                .HasForeignKey(x => x.DueId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.Title).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Amount).HasColumnType("numeric(18,2)");
            entity.Property(x => x.Category).HasMaxLength(100);
            entity.Property(x => x.InvoiceUrl).HasMaxLength(500);
        });

        modelBuilder.Entity<Announcement>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.Title).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Content).IsRequired().HasMaxLength(4000);
            entity.Property(x => x.CreatedAt).IsRequired();
            entity.HasOne(x => x.CreatedByUser)
                .WithMany(x => x.Announcements)
                .HasForeignKey(x => x.CreatedBy)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Ticket>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.Title).IsRequired().HasMaxLength(200);
            entity.Property(x => x.Description).IsRequired().HasMaxLength(4000);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(20);
            entity.Property(x => x.Priority).HasConversion<string>().HasMaxLength(20);
            entity.Property(x => x.CreatedAt).IsRequired();
            entity.HasOne(x => x.User)
                .WithMany(x => x.Tickets)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PropertyDocument>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.EntityType).IsRequired().HasMaxLength(50);
            entity.Property(x => x.DocumentCategory).IsRequired().HasMaxLength(100);
            entity.Property(x => x.FileName).IsRequired().HasMaxLength(200);
            entity.Property(x => x.FileUrl).IsRequired().HasMaxLength(1000);
            entity.Property(x => x.Notes).HasMaxLength(1000);
            entity.Property(x => x.CreatedAt).IsRequired();
            entity.HasIndex(x => new { x.EntityType, x.EntityId });
        });

        modelBuilder.Entity<AuditLog>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.Action).IsRequired().HasMaxLength(100);
            entity.Property(x => x.EntityName).IsRequired().HasMaxLength(100);
            entity.Property(x => x.Timestamp).IsRequired();
            entity.Property(x => x.Details).HasMaxLength(4000);
            entity.HasOne(x => x.User)
                .WithMany(x => x.AuditLogs)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Id).HasColumnType("uuid").ValueGeneratedOnAdd();
            entity.Property(x => x.TokenHash).IsRequired().HasMaxLength(200);
            entity.Property(x => x.ExpiresAt).IsRequired();
            entity.Property(x => x.CreatedAt).IsRequired();
            entity.Property(x => x.ReplacedByTokenHash).HasMaxLength(200);
            entity.HasIndex(x => x.TokenHash).IsUnique();
            entity.HasOne(x => x.User)
                .WithMany(x => x.RefreshTokens)
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
