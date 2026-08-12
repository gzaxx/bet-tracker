using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Trades;

public sealed class UpdateTradeHandler(
    AppDbContext db,
    IRequestValidator<UpdateTradeRequest> validator,
    FifoAccountingCalculator accounting)
{
    [WolverinePut("/api/v1/portfolios/{portfolioId:int}/trades/{id:int}")]
    public async Task<IResult> Handle(
        int portfolioId,
        int id,
        UpdateTradeRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var portfolio = await db.Portfolios.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == portfolioId, cancellationToken);
        if (portfolio is null)
        {
            return ApiErrors.NotFound("Portfolio", portfolioId);
        }

        if (!string.Equals(RequestNormalization.NormalizeCurrency(request.Currency), portfolio.Currency, StringComparison.Ordinal))
        {
            return ApiErrors.BadRequest("Trade currency must match the portfolio currency.");
        }

        var trade = await db.Trades
            .SingleOrDefaultAsync(candidate => candidate.PortfolioId == portfolioId && candidate.Id == id, cancellationToken);
        if (trade is null)
        {
            return ApiErrors.NotFound("Trade", id);
        }

        trade.Ticker = RequestNormalization.NormalizeTicker(request.Ticker);
        trade.TradeType = request.TradeType;
        trade.Shares = request.Shares;
        trade.Price = request.Price;
        trade.Commission = request.Commission;
        trade.ExecutedAt = request.ExecutedAt.ToUniversalTime();
        trade.Currency = RequestNormalization.NormalizeCurrency(request.Currency);
        trade.Notes = request.Notes?.Trim();
        trade.Isin = request.Isin?.Trim().ToUpperInvariant();

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        try
        {
            var history = await db.Trades.AsNoTracking()
                .Where(candidate => candidate.PortfolioId == portfolioId)
                .ToListAsync(cancellationToken);
            accounting.Calculate(history);
        }
        catch (InvalidTradeSequenceException exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ApiErrors.BadRequest(exception.Message);
        }

        await transaction.CommitAsync(cancellationToken);
        return Results.Ok(TradeDtoMapper.Map(trade));
    }
}

public sealed class DeleteTradeHandler(AppDbContext db, FifoAccountingCalculator accounting)
{
    [WolverineDelete("/api/v1/portfolios/{portfolioId:int}/trades/{id:int}")]
    public async Task<IResult> Handle(int portfolioId, int id, CancellationToken cancellationToken)
    {
        var trade = await db.Trades
            .SingleOrDefaultAsync(candidate => candidate.PortfolioId == portfolioId && candidate.Id == id, cancellationToken);
        if (trade is null)
        {
            return ApiErrors.NotFound("Trade", id);
        }

        db.Trades.Remove(trade);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        await db.SaveChangesAsync(cancellationToken);

        try
        {
            var history = await db.Trades.AsNoTracking()
                .Where(candidate => candidate.PortfolioId == portfolioId)
                .ToListAsync(cancellationToken);
            accounting.Calculate(history);
        }
        catch (InvalidTradeSequenceException exception)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ApiErrors.BadRequest(exception.Message);
        }

        await transaction.CommitAsync(cancellationToken);
        return Results.NoContent();
    }
}
