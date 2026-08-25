namespace SiteManagementSystem.Api.Infrastructure;

public class ResourceNotFoundException : Exception
{
    public ResourceNotFoundException(string message) : base(message)
    {
    }
}
