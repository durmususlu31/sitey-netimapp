using FluentValidation;
using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Validators;

public class CreateApartmentRequestValidator : AbstractValidator<CreateApartmentRequest>
{
    public CreateApartmentRequestValidator()
    {
        RuleFor(x => x.BlockId)
            .NotEmpty();

        RuleFor(x => x.ApartmentNumber)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.Floor)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.ApartmentType)
            .MaximumLength(100); 

        RuleFor(x => x.TapuNumber)
            .MaximumLength(100);
    }
}

public class UpdateApartmentRequestValidator : AbstractValidator<UpdateApartmentRequest>
{
    public UpdateApartmentRequestValidator()
    {
        RuleFor(x => x.BlockId)
            .NotEmpty();

        RuleFor(x => x.ApartmentNumber)
            .NotEmpty()
            .MaximumLength(50);

        RuleFor(x => x.Floor)
            .GreaterThanOrEqualTo(0);

        RuleFor(x => x.ApartmentType)
            .MaximumLength(100);

        RuleFor(x => x.TapuNumber)
            .MaximumLength(100);
    }
}
