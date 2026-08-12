using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Profiles;

public sealed class CreateProfileHandler(AppDbContext db, IRequestValidator<CreateProfileRequest> validator)
{
    [WolverinePost("/api/v1/profiles")]
    public async Task<IResult> Handle(CreateProfileRequest request, CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0) return ApiErrors.Validation(errors);

        var profile = new Profile
        {
            Name = RequestNormalization.NormalizeName(request.Name),
            DefaultCurrency = RequestNormalization.NormalizeCurrency(request.DefaultCurrency)
        };
        db.Profiles.Add(profile);

        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException) { return ApiErrors.Conflict("A profile with this name already exists."); }

        var dto = new ProfileDto(profile.Id, profile.Name, profile.DefaultCurrency, profile.CreatedAt, profile.UpdatedAt);
        return Results.Created($"/api/v1/profiles/{dto.Id}", dto);
    }
}
