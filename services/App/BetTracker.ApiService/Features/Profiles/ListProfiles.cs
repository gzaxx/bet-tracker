using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Profiles;

public sealed class ListProfilesHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/profiles")]
    public async Task<IResult> Handle(CancellationToken cancellationToken)
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
}
