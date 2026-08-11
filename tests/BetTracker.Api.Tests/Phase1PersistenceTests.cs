using Microsoft.EntityFrameworkCore;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data.Entities;

namespace BetTracker.Api.Tests;

public sealed class Phase1PersistenceTests
{
    [Fact]
    public async Task Initial_migration_creates_complete_schema_and_persists_all_resources()
    {
        await using var database = new SqliteTestDatabase();
        await using var db = await database.CreateContextAsync();

        var profile = new Profile
        {
            Name = "Personal",
            DefaultCurrency = "USD"
        };
        db.Profiles.Add(profile);
        await db.SaveChangesAsync();

        var portfolio = new Portfolio
        {
            ProfileId = profile.Id,
            Name = "Long term",
            Currency = profile.DefaultCurrency
        };
        db.Portfolios.Add(portfolio);
        db.Trades.Add(new Trade
        {
            Portfolio = portfolio,
            Ticker = "MSFT",
            TradeType = TradeType.Buy,
            Shares = 1.25m,
            Price = 400.1234m,
            Commission = 2.50m,
            ExecutedAt = database.Clock.UtcNow.AddMinutes(-1),
            Currency = "USD"
        });
        db.PriceObservations.Add(new PriceObservation
        {
            Ticker = "MSFT",
            Currency = "USD",
            Price = 401.1234m,
            EffectiveAt = database.Clock.UtcNow.AddMinutes(-1),
            Source = "Manual"
        });
        db.ETFs.Add(new ETF
        {
            Ticker = "VTI",
            Name = "Vanguard Total Stock Market ETF",
            Currency = "USD"
        });

        await db.SaveChangesAsync();

        Assert.Equal(1, await db.Profiles.CountAsync());
        Assert.Equal(1, await db.Portfolios.CountAsync());
        Assert.Equal(1, await db.Trades.CountAsync());
        Assert.Equal(1, await db.PriceObservations.CountAsync());
        Assert.Equal(1, await db.ETFs.CountAsync());
        Assert.Equal(database.Clock.UtcNow, profile.CreatedAt);
        Assert.Equal("USD", portfolio.Currency);
    }

    [Fact]
    public async Task Portfolio_currency_cannot_be_changed_after_creation()
    {
        await using var database = new SqliteTestDatabase();
        await using var db = await database.CreateContextAsync();
        var profile = new Profile { Name = "Personal", DefaultCurrency = "USD" };
        var portfolio = new Portfolio { Profile = profile, Name = "Main", Currency = "USD" };

        db.Add(portfolio);
        await db.SaveChangesAsync();
        db.Entry(portfolio).Property(nameof(Portfolio.Currency)).CurrentValue = "EUR";

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());

        Assert.Contains("immutable", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Price_history_allows_multiple_observations_for_one_ticker_and_currency()
    {
        await using var database = new SqliteTestDatabase();
        await using var db = await database.CreateContextAsync();
        db.PriceObservations.AddRange(
            new PriceObservation
            {
                Ticker = "MSFT",
                Currency = "USD",
                Price = 400,
                EffectiveAt = database.Clock.UtcNow.AddDays(-2),
                Source = "Manual"
            },
            new PriceObservation
            {
                Ticker = "MSFT",
                Currency = "USD",
                Price = 401,
                EffectiveAt = database.Clock.UtcNow.AddDays(-1),
                Source = "Manual"
            });

        await db.SaveChangesAsync();

        Assert.Equal(2, await db.PriceObservations.CountAsync(observation =>
            observation.Ticker == "MSFT" && observation.Currency == "USD"));
    }

    [Fact]
    public async Task Trade_precision_and_timestamp_ordering_are_configured()
    {
        await using var database = new SqliteTestDatabase();
        await using var db = await database.CreateContextAsync();
        var timestamp = database.Clock.UtcNow.AddHours(-1);
        var portfolio = new Portfolio
        {
            Profile = new Profile { Name = "Precision", DefaultCurrency = "USD" },
            Name = "Main",
            Currency = "USD"
        };
        db.Portfolios.Add(portfolio);
        db.Trades.AddRange(
            new Trade
            {
                Portfolio = portfolio,
                Ticker = "MSFT",
                TradeType = TradeType.Buy,
                Shares = 1.12345678m,
                Price = 100.1234m,
                Commission = 0,
                ExecutedAt = timestamp,
                Currency = "USD"
            },
            new Trade
            {
                Portfolio = portfolio,
                Ticker = "MSFT",
                TradeType = TradeType.Sell,
                Shares = 0.12345678m,
                Price = 101.1234m,
                Commission = 0,
                ExecutedAt = timestamp,
                Currency = "USD"
            });

        await db.SaveChangesAsync();

        var ordered = await db.Trades
            .OrderBy(trade => trade.ExecutedAt)
            .ThenBy(trade => trade.Id)
            .ToListAsync();
        var priceProperty = db.Model.FindEntityType(typeof(Trade))!
            .FindProperty(nameof(Trade.Price))!;
        var sharesProperty = db.Model.FindEntityType(typeof(Trade))!
            .FindProperty(nameof(Trade.Shares))!;

        Assert.Equal(ordered[0].Id, ordered[1].Id - 1);
        Assert.Equal(18, priceProperty.GetPrecision());
        Assert.Equal(4, priceProperty.GetScale());
        Assert.Equal(18, sharesProperty.GetPrecision());
        Assert.Equal(8, sharesProperty.GetScale());
    }

    [Fact]
    public void Validators_normalize_identifiers_and_reject_invalid_or_future_values()
    {
        var clock = new BetTracker.ApiService.Common.Time.FixedClock(
            new DateTimeOffset(2026, 1, 2, 12, 0, 0, TimeSpan.Zero));
        var validator = new CreateTradeRequestValidator(clock);
        var request = new CreateTradeRequest(
            1,
            " msft ",
            TradeType.Buy,
            1,
            100,
            0,
            clock.UtcNow.AddMinutes(1),
            "usd",
            null,
            null);

        var errors = validator.Validate(request);

        Assert.Contains(errors, error => error.Field == "executedAt");
        Assert.Equal("MSFT", RequestNormalization.NormalizeTicker(request.Ticker));
        Assert.Equal("USD", RequestNormalization.NormalizeCurrency(request.Currency));
        var priceErrors = new CreatePriceObservationRequestValidator(clock).Validate(
            new CreatePriceObservationRequest(
                "MSFT",
                "US",
                100,
                clock.UtcNow.AddMinutes(1),
                "Manual",
                null));

        Assert.Contains(priceErrors, error => error.Field == "currency");
        Assert.Contains(priceErrors, error => error.Field == "effectiveAt");
    }

    [Fact]
    public void DTOs_are_records_without_entity_navigation_properties()
    {
        var dto = new PortfolioDto(1, 2, "Main", "USD", DateTimeOffset.UnixEpoch, DateTimeOffset.UnixEpoch);

        Assert.Equal("Main", dto.Name);
        Assert.DoesNotContain(typeof(PortfolioDto).GetProperties(), property =>
            typeof(Profile).IsAssignableFrom(property.PropertyType) ||
            typeof(Portfolio).IsAssignableFrom(property.PropertyType));
    }
}
