using FluentValidation;
using SiteManagementSystem.Api.DTOs;

namespace SiteManagementSystem.Api.Validators;

public class CreateAuditLogRequestValidator : AbstractValidator<CreateAuditLogRequest>
{
    public CreateAuditLogRequestValidator()
    {
        RuleFor(x => x.Action).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EntityName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EntityId).NotEmpty();
        RuleFor(x => x.Details).MaximumLength(4000);
    }
}

public class UpdateAuditLogRequestValidator : AbstractValidator<UpdateAuditLogRequest>
{
    public UpdateAuditLogRequestValidator()
    {
        RuleFor(x => x.Action).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EntityName).NotEmpty().MaximumLength(100);
        RuleFor(x => x.EntityId).NotEmpty();
        RuleFor(x => x.Details).MaximumLength(4000);
    }
}
