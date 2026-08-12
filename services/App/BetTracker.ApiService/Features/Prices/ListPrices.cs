using System.Text.RegularExpressions;
using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Common.Time;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Prices;

public sealed class GetCurrentPriceHandler(AppDbContext db, IClock clock)
{
    [WolverineGet("/api/v1/prices/{ticker}")]
    public async Task<IResult> Handle(string ticker, string? currency, CancellationToken cancellationToken)
    {
        var validation = await PriceQueryRules.ValidateCurrencyAsync(db, currency, cancellationToken);
        if (validation is not null)
        {
            return validation;
        }

        var normalizedTicker = RequestNormalization.NormalizeTicker(ticker);
        var normalizedCurrency = RequestNormalization.NormalizeCurrency(currency);
        var currentObservation = await db.PriceObservations.AsNoTracking()
            .Where(observation =>
                observation.Ticker == normalizedTicker &&
                observation.Currency == normalizedCurrency &&
                observation.EffectiveAt <= clock.UtcNow)
            .OrderByDescending(observation => observation.EffectiveAt)
            .ThenByDescending(observation => observation.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var current = currentObservation is null ? null : PriceObservationDtoMapper.Map(currentObservation);

        return current is null
            ? Results.Content("null", "application/json")
            : Results.Ok(current);
    }
}

public sealed class ListPriceHistoryHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/prices/{ticker}/history")]
    public async Task<IResult> Handle(string ticker, string? currency, CancellationToken cancellationToken)
    {
        var validation = await PriceQueryRules.ValidateCurrencyAsync(db, currency, cancellationToken);
        if (validation is not null)
        {
            return validation;
        }

        var normalizedTicker = RequestNormalization.NormalizeTicker(ticker);
        var normalizedCurrency = RequestNormalization.NormalizeCurrency(currency);
        var observations = await db.PriceObservations.AsNoTracking()
            .Where(observation => observation.Ticker == normalizedTicker && observation.Currency == normalizedCurrency)
            .OrderByDescending(observation => observation.EffectiveAt)
            .ThenByDescending(observation => observation.Id)
            .ToListAsync(cancellationToken);
        var history = observations.Select(PriceObservationDtoMapper.Map).ToList();

        return Results.Ok(history);
    }
}


internal static class PriceQueryRules
{
    private static readonly Regex CurrencyPattern = new("^[A-Z]{3}$", RegexOptions.CultureInvariant);

    public static async Task<IResult?> ValidateCurrencyAsync(
        AppDbContext db,
        string? currency,
        CancellationToken cancellationToken)
    {
        var normalizedCurrency = RequestNormalization.NormalizeCurrency(currency);
        if (!CurrencyPattern.IsMatch(normalizedCurrency))
        {
            return ApiErrors.Validation([new ValidationError("currency", "currency must be a three-letter ISO currency code.")]);
        }

        var portfolioCurrencies = await db.Portfolios.AsNoTracking()
            .Select(portfolio => portfolio.Currency)
            .Distinct()
            .ToListAsync(cancellationToken);
        if (portfolioCurrencies.Count > 0 && !portfolioCurrencies.Contains(normalizedCurrency, StringComparer.Ordinal))
        {
            return ApiErrors.BadRequest("Price currency must match one of the portfolio currencies.");
        }

        return null;
    }
}

internal static class PriceObservationDtoMapper
{
    public static PriceObservationDto Map(Data.Entities.PriceObservation observation) => new(
        observation.Id,
        observation.Ticker,
        observation.Currency,
        observation.Price,
        observation.EffectiveAt,
        observation.CreatedAt,
        observation.Source,
        observation.ProviderSymbol);
}
