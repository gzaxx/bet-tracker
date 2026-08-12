using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Profiles;

public sealed class UpdateProfileHandler(AppDbContext db, IRequestValidator<UpdateProfileRequest> validator)
{
    [WolverinePut("/api/v1/profiles/{id}")]
    public async Task<IResult> Handle(int id, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0) return ApiErrors.Validation(errors);

        var profile = await db.Profiles.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (profile is null) return ApiErrors.NotFound("Profile", id);

        profile.Name = RequestNormalization.NormalizeName(request.Name);
        profile.DefaultCurrency = RequestNormalization.NormalizeCurrency(request.DefaultCurrency);
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException) { return ApiErrors.Conflict("A profile with this name already exists."); }

        return Results.Ok(new ProfileDto(profile.Id, profile.Name, profile.DefaultCurrency, profile.CreatedAt, profile.UpdatedAt));
    }
}
