using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Profiles;

public sealed class GetProfileHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/profiles/{id}")]
    public async Task<IResult> Handle(int id, CancellationToken cancellationToken)
    {
        var profile = await db.Profiles
            .AsNoTracking()
            .Where(candidate => candidate.Id == id)
            .Select(candidate => new ProfileDto(candidate.Id, candidate.Name, candidate.DefaultCurrency, candidate.CreatedAt, candidate.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return profile is null ? ApiErrors.NotFound("Profile", id) : Results.Ok(profile);
    }
}
