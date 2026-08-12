using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Portfolios;

public sealed class DeletePortfolioHandler(AppDbContext db)
{
    [WolverineDelete("/api/v1/portfolios/{id}")]
    public async Task<IResult> Handle(int id, CancellationToken cancellationToken)
    {
        var portfolio = await db.Portfolios.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (portfolio is null) return ApiErrors.NotFound("Portfolio", id);
        db.Portfolios.Remove(portfolio);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }
}
