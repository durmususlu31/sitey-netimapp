using FluentValidation;
using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Validators;

public class CreateBlockRequestValidator : AbstractValidator<CreateBlockRequest>
{
    public CreateBlockRequestValidator()
    {
        RuleFor(x => x.SiteId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(150);
    }
}

public class UpdateBlockRequestValidator : AbstractValidator<UpdateBlockRequest>
{
    public UpdateBlockRequestValidator()
    {
        RuleFor(x => x.SiteId)
            .NotEmpty();

        RuleFor(x => x.Name)
            .NotEmpty()
            .MaximumLength(150);
    }
}
