using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Profiles;

public sealed class DeleteProfileHandler(AppDbContext db)
{
    [WolverineDelete("/api/v1/profiles/{id}")]
    public async Task<IResult> Handle(int id, CancellationToken cancellationToken)
    {
        var profile = await db.Profiles.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (profile is null) return ApiErrors.NotFound("Profile", id);
        db.Profiles.Remove(profile);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }
}
