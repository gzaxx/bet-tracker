using BetTracker.ApiService.Data.Entities;

namespace BetTracker.ApiService.Contracts;

public sealed record ProfileDto(
    int Id,
    string Name,
    string DefaultCurrency,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record PortfolioDto(
    int Id,
    int ProfileId,
    string Name,
    string Currency,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record TradeDto(
    int Id,
    int PortfolioId,
    string Ticker,
    TradeType TradeType,
    decimal Shares,
    decimal Price,
    decimal Commission,
    DateTimeOffset ExecutedAt,
    string? Notes,
    string? Isin,
    string Currency);

public sealed record PriceObservationDto(
    int Id,
    string Ticker,
    string Currency,
    decimal Price,
    DateTimeOffset EffectiveAt,
    DateTimeOffset CreatedAt,
    string Source,
    string? ProviderSymbol);

public sealed record ETFDto(
    int Id,
    string Ticker,
    string? Name,
    string? Exchange,
    string? Isin,
    string? Currency,
    decimal? ExpenseRatio,
    DateTimeOffset CreatedAt);

public sealed record CreateProfileRequest(string Name, string DefaultCurrency);
public sealed record UpdateProfileRequest(string Name, string DefaultCurrency);

public sealed record CreatePortfolioRequest(int ProfileId, string Name);
public sealed record UpdatePortfolioRequest(string Name);

public sealed record CreateTradeRequest(
    int PortfolioId,
    string Ticker,
    TradeType TradeType,
    decimal Shares,
    decimal Price,
    decimal Commission,
    DateTimeOffset ExecutedAt,
    string Currency,
    string? Notes,
    string? Isin);

public sealed record UpdateTradeRequest(
    string Ticker,
    TradeType TradeType,
    decimal Shares,
    decimal Price,
    decimal Commission,
    DateTimeOffset ExecutedAt,
    string Currency,
    string? Notes,
    string? Isin);

public sealed record CreatePriceObservationRequest(
    string Ticker,
    string Currency,
    decimal Price,
    DateTimeOffset EffectiveAt,
    string Source,
    string? ProviderSymbol);

public sealed record UpdatePriceObservationRequest(
    string Ticker,
    string Currency,
    decimal Price,
    DateTimeOffset EffectiveAt,
    string Source,
    string? ProviderSymbol);

public sealed record CreateETFRequest(
    string Ticker,
    string? Name,
    string? Exchange,
    string? Isin,
    string? Currency,
    decimal? ExpenseRatio);

public sealed record UpdateETFRequest(
    string Ticker,
    string? Name,
    string? Exchange,
    string? Isin,
    string? Currency,
    decimal? ExpenseRatio);
