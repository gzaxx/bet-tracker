using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Profiles;

public static class ProfileEndpoints
{
    [WolverineGet("/api/v1/profiles")]
    public static async Task<IResult> List(AppDbContext db, CancellationToken cancellationToken)
    {
        var profiles = await db.Profiles
            .AsNoTracking()
            .OrderBy(profile => profile.Name)
            .ThenBy(profile => profile.Id)
            .Select(profile => new ProfileDto(
                profile.Id,
                profile.Name,
                profile.DefaultCurrency,
                profile.CreatedAt,
                profile.UpdatedAt))
            .ToArrayAsync(cancellationToken);

        return Results.Ok(profiles);
    }

    [WolverineGet("/api/v1/profiles/{id}")]
    public static async Task<IResult> Get(int id, AppDbContext db, CancellationToken cancellationToken)
    {
        var profile = await db.Profiles
            .AsNoTracking()
            .Where(candidate => candidate.Id == id)
            .Select(candidate => new ProfileDto(
                candidate.Id,
                candidate.Name,
                candidate.DefaultCurrency,
                candidate.CreatedAt,
                candidate.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return profile is null ? ApiErrors.NotFound("Profile", id) : Results.Ok(profile);
    }

    [WolverinePost("/api/v1/profiles")]
    public static async Task<IResult> Create(
        CreateProfileRequest request,
        AppDbContext db,
        IRequestValidator<CreateProfileRequest> validator,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var profile = new Profile
        {
            Name = RequestNormalization.NormalizeName(request.Name),
            DefaultCurrency = RequestNormalization.NormalizeCurrency(request.DefaultCurrency)
        };
        db.Profiles.Add(profile);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ApiErrors.Conflict("A profile with this name already exists.");
        }

        var dto = ToDto(profile);
        return Results.Created($"/api/v1/profiles/{dto.Id}", dto);
    }

    [WolverinePut("/api/v1/profiles/{id}")]
    public static async Task<IResult> Update(
        int id,
        UpdateProfileRequest request,
        AppDbContext db,
        IRequestValidator<UpdateProfileRequest> validator,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var profile = await db.Profiles.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (profile is null)
        {
            return ApiErrors.NotFound("Profile", id);
        }

        profile.Name = RequestNormalization.NormalizeName(request.Name);
        profile.DefaultCurrency = RequestNormalization.NormalizeCurrency(request.DefaultCurrency);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ApiErrors.Conflict("A profile with this name already exists.");
        }

        return Results.Ok(ToDto(profile));
    }

    [WolverineDelete("/api/v1/profiles/{id}")]
    public static async Task<IResult> Delete(int id, AppDbContext db, CancellationToken cancellationToken)
    {
        var profile = await db.Profiles.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (profile is null)
        {
            return ApiErrors.NotFound("Profile", id);
        }

        db.Profiles.Remove(profile);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static ProfileDto ToDto(Profile profile) => new(
        profile.Id,
        profile.Name,
        profile.DefaultCurrency,
        profile.CreatedAt,
        profile.UpdatedAt);
}
