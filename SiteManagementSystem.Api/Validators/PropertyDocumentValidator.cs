using FluentValidation;
using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Validators;

public class CreatePropertyDocumentRequestValidator : AbstractValidator<CreatePropertyDocumentRequest>
{
    public CreatePropertyDocumentRequestValidator()
    {
        RuleFor(x => x.EntityType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.EntityId).NotEmpty();
        RuleFor(x => x.DocumentCategory).NotEmpty().MaximumLength(100);
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.FileUrl)
            .NotEmpty()
            .MaximumLength(1000)
            .Must(value => Uri.TryCreate(value, UriKind.Absolute, out _))
            .WithMessage("FileUrl must be a valid absolute URL.");
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}

public class UpdatePropertyDocumentRequestValidator : AbstractValidator<UpdatePropertyDocumentRequest>
{
    public UpdatePropertyDocumentRequestValidator()
    {
        RuleFor(x => x.EntityType).NotEmpty().MaximumLength(50);
        RuleFor(x => x.EntityId).NotEmpty();
        RuleFor(x => x.DocumentCategory).NotEmpty().MaximumLength(100);
        RuleFor(x => x.FileName).NotEmpty().MaximumLength(200);
        RuleFor(x => x.FileUrl)
            .NotEmpty()
            .MaximumLength(1000)
            .Must(value => Uri.TryCreate(value, UriKind.Absolute, out _))
            .WithMessage("FileUrl must be a valid absolute URL.");
        RuleFor(x => x.Notes).MaximumLength(1000);
    }
}
