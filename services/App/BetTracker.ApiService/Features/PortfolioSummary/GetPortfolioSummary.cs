using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Common.Time;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Features.Trades;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.PortfolioSummary;

public sealed class GetPortfolioSummaryHandler(
    AppDbContext db,
    FifoAccountingCalculator accounting,
    IClock clock)
{
    [WolverineGet("/api/v1/portfolios/{portfolioId:int}/summary")]
    public async Task<IResult> Handle(int portfolioId, CancellationToken cancellationToken)
    {
        var portfolio = await db.Portfolios.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == portfolioId, cancellationToken);
        if (portfolio is null)
        {
            return ApiErrors.NotFound("Portfolio", portfolioId);
        }

        var trades = await db.Trades.AsNoTracking()
            .Where(trade => trade.PortfolioId == portfolioId)
            .ToListAsync(cancellationToken);
        var accountingResult = accounting.Calculate(trades);
        var tickers = accountingResult.OpenPositions.Keys.ToArray();
        var observations = tickers.Length == 0
            ? []
            : await db.PriceObservations.AsNoTracking()
                .Where(observation =>
                    tickers.Contains(observation.Ticker) &&
                    observation.Currency == portfolio.Currency &&
                    observation.EffectiveAt <= clock.UtcNow)
                .OrderByDescending(observation => observation.EffectiveAt)
                .ThenByDescending(observation => observation.Id)
                .ToListAsync(cancellationToken);
        var currentPrices = observations
            .GroupBy(observation => observation.Ticker, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.First().Price,
                StringComparer.OrdinalIgnoreCase);

        var holdings = accountingResult.OpenPositions
            .OrderBy(position => position.Key, StringComparer.OrdinalIgnoreCase)
            .Select(position =>
            {
                var ticker = position.Key;
                var shares = position.Value;
                var costBasis = accountingResult.OpenCostBasis[ticker];
                var averageCost = costBasis / shares;
                var currentPrice = currentPrices.TryGetValue(ticker, out var latestPrice) ? latestPrice : (decimal?)null;
                var currentValue = currentPrice is null ? (decimal?)null : shares * currentPrice.Value;
                var unrealizedProfitLoss = currentValue is null ? (decimal?)null : currentValue.Value - costBasis;
                return new HoldingSummaryDto(
                    ticker,
                    shares,
                    averageCost,
                    costBasis,
                    currentPrice,
                    currentValue,
                    unrealizedProfitLoss);
            })
            .ToList();
        var missingPriceTickers = holdings
            .Where(holding => holding.CurrentPrice is null)
            .Select(holding => holding.Ticker)
            .ToList();
        var pricedHoldings = holdings.Where(holding => holding.CurrentValue is not null).ToList();

        var summary = new PortfolioSummaryDto(
            portfolioId,
            portfolio.Currency,
            holdings.Sum(holding => holding.CostBasis),
            pricedHoldings.Sum(holding => holding.CurrentValue!.Value),
            accountingResult.RealizedGainLoss,
            pricedHoldings.Sum(holding => holding.UnrealizedProfitLoss!.Value),
            missingPriceTickers,
            holdings);

        return Results.Ok(summary);
    }
}
