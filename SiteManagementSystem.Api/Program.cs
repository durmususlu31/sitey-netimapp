using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using SiteManagementSystem.Api.Data;
using SiteManagementSystem.Api.Domain.Entities;
using SiteManagementSystem.Api.Infrastructure;
using SiteManagementSystem.Api.Middleware;
using SiteManagementSystem.Api.Services;

var builder = WebApplication.CreateBuilder(args);

var env = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production";
var host = Environment.GetEnvironmentVariable("POSTGRES_HOST") ?? "localhost";
var port = Environment.GetEnvironmentVariable("POSTGRES_PORT") ?? "5432";
var database = Environment.GetEnvironmentVariable("POSTGRES_DB") ?? "site_management";
var username = Environment.GetEnvironmentVariable("POSTGRES_USER") ?? "siteadmin";
var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD") ?? "development-only-password";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT_ISSUER") ?? builder.Configuration["Jwt:Issuer"] ?? "SiteManagementSystem";
var jwtAudience = Environment.GetEnvironmentVariable("JWT_AUDIENCE") ?? builder.Configuration["Jwt:Audience"] ?? "SiteManagementSystem.Client";
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? builder.Configuration["Jwt:SecretKey"] ?? "development-super-secret-key-change-before-production-123456789";
var accessTokenMinutes = int.TryParse(Environment.GetEnvironmentVariable("JWT_ACCESS_TOKEN_MINUTES"), out var parsedAccessMinutes)
    ? parsedAccessMinutes
    : int.TryParse(builder.Configuration["Jwt:AccessTokenMinutes"], out var configuredAccessMinutes) ? configuredAccessMinutes : 30;
var refreshTokenDays = int.TryParse(Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_DAYS"), out var parsedRefreshDays)
    ? parsedRefreshDays
    : int.TryParse(builder.Configuration["Jwt:RefreshTokenDays"], out var configuredRefreshDays) ? configuredRefreshDays : 7;

var connectionString =
    builder.Configuration.GetConnectionString("DefaultConnection") ??
    $"Host={host};Port={port};Database={database};Username={username};Password={password};";

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendDevPolicy", policy =>
    {
        policy
            .WithOrigins(
                "http://localhost:5173",
                "https://localhost:5173",
                "http://127.0.0.1:5173",
                "https://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(type => type.FullName?.Replace("+", "."));
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Enter JWT Bearer token."
    });
    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(connectionString));

var jwtOptions = new JwtOptions
{
    Issuer = jwtIssuer,
    Audience = jwtAudience,
    SecretKey = jwtSecret,
    AccessTokenMinutes = accessTokenMinutes,
    RefreshTokenDays = refreshTokenDays
};

builder.Services.AddSingleton(jwtOptions);
builder.Services.AddScoped<IPasswordHashService, BcryptPasswordHashService>();
builder.Services.AddScoped<IAuthService, AuthService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateIssuerSigningKey = true,
            ValidateLifetime = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidAudience = jwtOptions.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.SecretKey)),
            ClockSkew = TimeSpan.FromSeconds(30)
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole(UserRole.ADMIN.ToString()));
    options.AddPolicy("ResidentOnly", policy => policy.RequireRole(UserRole.RESIDENT.ToString()));
    options.AddPolicy("ManagerOnly", policy => policy.RequireRole(UserRole.MANAGER.ToString()));
    options.AddPolicy("AdminOrResident", policy => policy.RequireRole(UserRole.ADMIN.ToString(), UserRole.RESIDENT.ToString()));
});

builder.Services.AddScoped<ISiteService, SiteService>();
builder.Services.AddScoped<IBlockService, BlockService>();
builder.Services.AddScoped<IApartmentService, ApartmentService>();
builder.Services.AddScoped<IOwnerService, OwnerService>();
builder.Services.AddScoped<ITenantService, TenantService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IDueService, DueService>();
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<IAnnouncementService, AnnouncementService>();
builder.Services.AddScoped<ITicketService, TicketService>();
builder.Services.AddScoped<IAuditLogService, AuditLogService>();
builder.Services.AddScoped<IPropertyDocumentService, PropertyDocumentService>();
builder.Services.AddScoped<IReportingService, ReportingService>();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.Migrate();

    if (app.Environment.IsDevelopment())
    {
        await DbSeeder.SeedAsync(dbContext);
    }
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Site Management System API V1");
        c.RoutePrefix = "swagger";
    });
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors("FrontendDevPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();

public partial class Program
{
}
