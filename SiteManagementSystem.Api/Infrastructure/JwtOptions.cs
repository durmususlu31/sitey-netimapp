namespace SiteManagementSystem.Api.Infrastructure;

public class JwtOptions
{
    public string Issuer { get; set; } = "SiteManagementSystem";
    public string Audience { get; set; } = "SiteManagementSystem.Client";
    public string SecretKey { get; set; } = "development-super-secret-key-change-before-production-123456789";
    public int AccessTokenMinutes { get; set; } = 30;
    public int RefreshTokenDays { get; set; } = 7;
}
