using SiteManagementSystem.Api.Domain.Entities;

namespace SiteManagementSystem.Api.DTOs;

public record CreateTicketRequest(
    Guid UserId,
    string Title,
    string Description,
    TicketStatus Status,
    TicketPriority Priority);

public record UpdateTicketRequest(
    Guid UserId,
    string Title,
    string Description,
    TicketStatus Status,
    TicketPriority Priority);

public record TicketResponse(
    Guid Id,
    Guid UserId,
    string Title,
    string Description,
    TicketStatus Status,
    TicketPriority Priority,
    DateTime CreatedAt);
