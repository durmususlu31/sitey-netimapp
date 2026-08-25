namespace SiteManagementSystem.Api.Infrastructure;

public class ApiResponse<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public ApiError? Error { get; set; }

    public static ApiResponse<T> Ok(T data) => new() { Success = true, Data = data };

    public static ApiResponse<T> Fail(string code, string message, object? details = null) => new()
    {
        Success = false,
        Error = new ApiError(code, message, details)
    };
}

public class ApiError
{
    public ApiError(string code, string message, object? details = null)
    {
        Code = code;
        Message = message;
        Details = details;
    }

    public string Code { get; set; }
    public string Message { get; set; }
    public object? Details { get; set; }
}
