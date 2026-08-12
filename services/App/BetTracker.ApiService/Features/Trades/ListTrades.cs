using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Trades;

public sealed class ListTradesHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/portfolios/{portfolioId:int}/trades")]
    public async Task<IResult> Handle(int portfolioId, CancellationToken cancellationToken)
    {
        if (!await db.Portfolios.AsNoTracking().AnyAsync(portfolio => portfolio.Id == portfolioId, cancellationToken))
        {
            return ApiErrors.NotFound("Portfolio", portfolioId);
        }

        var trades = (await db.Trades.AsNoTracking()
            .Where(trade => trade.PortfolioId == portfolioId)
            .OrderBy(trade => trade.ExecutedAt)
            .ThenBy(trade => trade.Id)
            .ToListAsync(cancellationToken))
            .Select(TradeDtoMapper.Map)
            .ToList();

        return Results.Ok(trades);
    }
}

public sealed class GetTradeHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/portfolios/{portfolioId:int}/trades/{id:int}")]
    public async Task<IResult> Handle(int portfolioId, int id, CancellationToken cancellationToken)
    {
        var trade = await db.Trades.AsNoTracking()
            .Where(candidate => candidate.PortfolioId == portfolioId && candidate.Id == id)
            .SingleOrDefaultAsync(cancellationToken);
        var dto = trade is null ? null : TradeDtoMapper.Map(trade);

        return dto is null ? ApiErrors.NotFound("Trade", id) : Results.Ok(dto);
    }
}

internal static class TradeDtoMapper
{
    public static TradeDto Map(Data.Entities.Trade trade) => new(
        trade.Id,
        trade.PortfolioId,
        trade.Ticker,
        trade.TradeType,
        trade.Shares,
        trade.Price,
        trade.Commission,
        trade.ExecutedAt,
        trade.Notes,
        trade.Isin,
        trade.Currency);
}
