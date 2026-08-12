using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Prices;

public sealed class CreatePriceHandler(
    AppDbContext db,
    IRequestValidator<CreatePriceObservationRequest> validator)
{
    [WolverinePost("/api/v1/prices")]
    public async Task<IResult> Handle(
        CreatePriceObservationRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request).ToList();
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var ticker = RequestNormalization.NormalizeTicker(request.Ticker);
        var currency = RequestNormalization.NormalizeCurrency(request.Currency);
        var currencyError = await PriceCurrencyRules.ValidateAsync(db, currency, cancellationToken);
        if (currencyError is not null)
        {
            return currencyError;
        }

        var observation = new PriceObservation
        {
            Ticker = ticker,
            Currency = currency,
            Price = request.Price,
            EffectiveAt = request.EffectiveAt.ToUniversalTime(),
            Source = PriceCurrencyRules.ManualSource,
            ProviderSymbol = request.ProviderSymbol?.Trim()
        };
        db.PriceObservations.Add(observation);
        await db.SaveChangesAsync(cancellationToken);

        return Results.Created($"/api/v1/prices/{observation.Id}", PriceObservationDtoMapper.Map(observation));
    }
}

public sealed class UpdatePriceHandler(
    AppDbContext db,
    IRequestValidator<UpdatePriceObservationRequest> validator)
{
    [WolverinePut("/api/v1/prices/{id:int}")]
    public async Task<IResult> Handle(
        int id,
        UpdatePriceObservationRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request).ToList();
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var observation = await db.PriceObservations.SingleOrDefaultAsync(
            candidate => candidate.Id == id,
            cancellationToken);
        if (observation is null)
        {
            return ApiErrors.NotFound("Price observation", id);
        }

        var ticker = RequestNormalization.NormalizeTicker(request.Ticker);
        var currency = RequestNormalization.NormalizeCurrency(request.Currency);
        var currencyError = await PriceCurrencyRules.ValidateAsync(db, currency, cancellationToken);
        if (currencyError is not null)
        {
            return currencyError;
        }

        observation.Ticker = ticker;
        observation.Currency = currency;
        observation.Price = request.Price;
        observation.EffectiveAt = request.EffectiveAt.ToUniversalTime();
        observation.Source = PriceCurrencyRules.ManualSource;
        observation.ProviderSymbol = request.ProviderSymbol?.Trim();
        await db.SaveChangesAsync(cancellationToken);

        return Results.Ok(PriceObservationDtoMapper.Map(observation));
    }
}

public sealed class DeletePriceHandler(AppDbContext db)
{
    [WolverineDelete("/api/v1/prices/{id:int}")]
    public async Task<IResult> Handle(int id, CancellationToken cancellationToken)
    {
        var observation = await db.PriceObservations.SingleOrDefaultAsync(
            candidate => candidate.Id == id,
            cancellationToken);
        if (observation is null)
        {
            return ApiErrors.NotFound("Price observation", id);
        }

        db.PriceObservations.Remove(observation);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }
}

internal static class PriceCurrencyRules
{
    public const string ManualSource = "Manual";

    public static async Task<IResult?> ValidateAsync(
        AppDbContext db,
        string currency,
        CancellationToken cancellationToken)
    {
        var portfolioCurrencies = await db.Portfolios.AsNoTracking()
            .Select(portfolio => portfolio.Currency)
            .Distinct()
            .ToListAsync(cancellationToken);
        if (portfolioCurrencies.Count > 0 && !portfolioCurrencies.Contains(currency, StringComparer.Ordinal))
        {
            return ApiErrors.BadRequest("Price currency must match one of the portfolio currencies.");
        }

        return null;
    }
}
