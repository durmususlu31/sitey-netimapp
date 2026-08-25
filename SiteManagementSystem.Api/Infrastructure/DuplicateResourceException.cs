namespace SiteManagementSystem.Api.Infrastructure;

public class DuplicateResourceException : Exception
{
    public DuplicateResourceException(string code, string message)
        : base(message)
    {
        Code = code;
    }

    public string Code { get; }
}
