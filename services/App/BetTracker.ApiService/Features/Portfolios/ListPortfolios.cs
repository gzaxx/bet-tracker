using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Portfolios;

public sealed class ListPortfoliosHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/portfolios")]
    public async Task<IResult> Handle(CancellationToken cancellationToken)
    {
        var portfolios = await db.Portfolios
            .AsNoTracking()
            .OrderBy(portfolio => portfolio.ProfileId)
            .ThenBy(portfolio => portfolio.Name)
            .ThenBy(portfolio => portfolio.Id)
            .Select(portfolio => new PortfolioDto(portfolio.Id, portfolio.ProfileId, portfolio.Name, portfolio.Currency, portfolio.CreatedAt, portfolio.UpdatedAt))
            .ToArrayAsync(cancellationToken);

        return Results.Ok(portfolios);
    }
}
