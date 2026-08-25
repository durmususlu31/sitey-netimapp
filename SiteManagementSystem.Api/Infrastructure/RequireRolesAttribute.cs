using Microsoft.AspNetCore.Authorization;
using SiteManagementSystem.Api.Domain.Entities;

namespace SiteManagementSystem.Api.Infrastructure;

public class RequireRolesAttribute : AuthorizeAttribute
{
    public RequireRolesAttribute(params UserRole[] roles)
    {
        Roles = string.Join(",", roles.Select(x => x.ToString()));
    }
}
