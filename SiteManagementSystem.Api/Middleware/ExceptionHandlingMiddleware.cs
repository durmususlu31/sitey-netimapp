using System.Text.Json;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using SiteManagementSystem.Api.Infrastructure;

namespace SiteManagementSystem.Api.Middleware;

public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "An unhandled exception occurred.");
            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = exception switch
        {
            ValidationException validationException => ApiResponse<object>.Fail(
                "VALIDATION_ERROR",
                "Validation failed.",
                validationException.Errors
                    .GroupBy(x => x.PropertyName)
                    .ToDictionary(group => group.Key, group => group.Select(x => x.ErrorMessage).ToArray())),
            ResourceNotFoundException resourceNotFoundException => ApiResponse<object>.Fail(
                "RESOURCE_NOT_FOUND",
                resourceNotFoundException.Message),
            DuplicateResourceException duplicateResourceException => ApiResponse<object>.Fail(
                duplicateResourceException.Code,
                duplicateResourceException.Message),
            UnauthorizedAccessException unauthorizedAccessException => ApiResponse<object>.Fail(
                "UNAUTHORIZED",
                unauthorizedAccessException.Message),
            DbUpdateException => ApiResponse<object>.Fail(
                "DATABASE_CONSTRAINT_VIOLATION",
                "A database constraint error occurred."),
            _ => ApiResponse<object>.Fail(
                "INTERNAL_SERVER_ERROR",
                "An unexpected error occurred.")
        };

        context.Response.StatusCode = exception switch
        {
            ValidationException => StatusCodes.Status400BadRequest,
            ResourceNotFoundException => StatusCodes.Status404NotFound,
            DuplicateResourceException => StatusCodes.Status409Conflict,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            DbUpdateException => StatusCodes.Status409Conflict,
            _ => StatusCodes.Status500InternalServerError
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await context.Response.WriteAsync(json);
    }
}
