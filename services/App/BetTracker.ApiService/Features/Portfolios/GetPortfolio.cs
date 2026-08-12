using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Portfolios;

public sealed class GetPortfolioHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/portfolios/{id}")]
    public async Task<IResult> Handle(int id, CancellationToken cancellationToken)
    {
        var portfolio = await db.Portfolios.AsNoTracking()
            .Where(candidate => candidate.Id == id)
            .Select(candidate => new PortfolioDto(candidate.Id, candidate.ProfileId, candidate.Name, candidate.Currency, candidate.CreatedAt, candidate.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return portfolio is null ? ApiErrors.NotFound("Portfolio", id) : Results.Ok(portfolio);
    }
}
