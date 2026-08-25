using FluentValidation;
using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Validators;

public class CreateTenantRequestValidator : AbstractValidator<CreateTenantRequest>
{
    public CreateTenantRequestValidator()
    {
        RuleFor(x => x.ApartmentId)
            .NotEmpty();

        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Phone)
            .MaximumLength(50);

        RuleFor(x => x.Email)
            .EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email))
            .WithMessage("Email must be a valid email address.");

        RuleFor(x => x.IdNumber)
            .MaximumLength(100);

        RuleFor(x => x.MoveOutDate)
            .GreaterThan(x => x.MoveInDate)
            .When(x => x.MoveInDate.HasValue && x.MoveOutDate.HasValue)
            .WithMessage("Move out date must be after the move-in date.");
    }
}

public class UpdateTenantRequestValidator : AbstractValidator<UpdateTenantRequest>
{
    public UpdateTenantRequestValidator()
    {
        RuleFor(x => x.ApartmentId)
            .NotEmpty();

        RuleFor(x => x.FullName)
            .NotEmpty()
            .MaximumLength(200);

        RuleFor(x => x.Phone)
            .MaximumLength(50);

        RuleFor(x => x.Email)
            .EmailAddress()
            .When(x => !string.IsNullOrWhiteSpace(x.Email))
            .WithMessage("Email must be a valid email address.");

        RuleFor(x => x.IdNumber)
            .MaximumLength(100);

        RuleFor(x => x.MoveOutDate)
            .GreaterThan(x => x.MoveInDate)
            .When(x => x.MoveInDate.HasValue && x.MoveOutDate.HasValue)
            .WithMessage("Move out date must be after the move-in date.");
    }
}
