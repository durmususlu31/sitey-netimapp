using FluentValidation;
using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Validators;

public class CreateDueRequestValidator : AbstractValidator<CreateDueRequest>
{
    public CreateDueRequestValidator()
    {
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Period)
            .NotEmpty()
            .MaximumLength(7)
            .Must(period => period is null || System.Text.RegularExpressions.Regex.IsMatch(period.Trim(), "^\\d{4}-(0[1-9]|1[0-2])$"))
            .WithMessage("Dönem YYYY-MM formatında olmalıdır.");
        RuleFor(x => x.DueDate).NotEmpty();
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public class UpdateDueRequestValidator : AbstractValidator<UpdateDueRequest>
{
    public UpdateDueRequestValidator()
    {
        RuleFor(x => x.ApartmentId).NotEmpty();
        RuleFor(x => x.Amount).GreaterThanOrEqualTo(0);
        RuleFor(x => x.Period)
            .NotEmpty()
            .MaximumLength(7)
            .Must(period => period is null || System.Text.RegularExpressions.Regex.IsMatch(period.Trim(), "^\\d{4}-(0[1-9]|1[0-2])$"))
            .WithMessage("Dönem YYYY-MM formatında olmalıdır.");
        RuleFor(x => x.DueDate).NotEmpty();
        RuleFor(x => x.Description).MaximumLength(500);
    }
}
