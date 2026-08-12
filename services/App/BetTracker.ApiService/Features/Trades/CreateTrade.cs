using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Trades;

public sealed class CreateTradeHandler(
    AppDbContext db,
    IRequestValidator<CreateTradeRequest> validator,
    FifoAccountingCalculator accounting)
{
    [WolverinePost("/api/v1/portfolios/{portfolioId:int}/trades")]
    public async Task<IResult> Handle(
        int portfolioId,
        CreateTradeRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request).ToList();
        if (request.PortfolioId != portfolioId)
        {
            errors.Add(new ValidationError(nameof(request.PortfolioId), "PortfolioId must match the route portfolio."));
        }

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

        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var trade = new Trade
        {
            PortfolioId = portfolioId,
            Ticker = RequestNormalization.NormalizeTicker(request.Ticker),
            TradeType = request.TradeType,
            Shares = request.Shares,
            Price = request.Price,
            Commission = request.Commission,
            ExecutedAt = request.ExecutedAt.ToUniversalTime(),
            Currency = RequestNormalization.NormalizeCurrency(request.Currency),
            Notes = request.Notes?.Trim(),
            Isin = request.Isin?.Trim().ToUpperInvariant()
        };
        db.Trades.Add(trade);
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
        return Results.Created($"/api/v1/portfolios/{portfolioId}/trades/{trade.Id}", TradeDtoMapper.Map(trade));
    }
}
