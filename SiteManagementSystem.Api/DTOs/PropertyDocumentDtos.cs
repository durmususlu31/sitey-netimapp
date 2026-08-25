namespace SiteManagementSystem.Api.DTOs;

public record CreatePropertyDocumentRequest(
    string EntityType,
    Guid EntityId,
    string DocumentCategory,
    string FileName,
    string FileUrl,
    string Notes);

public record UpdatePropertyDocumentRequest(
    string EntityType,
    Guid EntityId,
    string DocumentCategory,
    string FileName,
    string FileUrl,
    string Notes);

public record PropertyDocumentResponse(
    Guid Id,
    string EntityType,
    Guid EntityId,
    string DocumentCategory,
    string FileName,
    string FileUrl,
    string Notes,
    DateTime CreatedAt);
