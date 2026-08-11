# Phase 2 Plan — Automatic Price Fetching

This phase follows the local-only POC. The POC must first support manual current and historical price observations and deterministic portfolio P&L.

## Goal

Automatically collect current market prices for tracked instruments without changing the manual price, portfolio-currency, or FIFO accounting contracts.

## Scope

- Fetch current prices for tracked tickers on a scheduled background job.
- Keep historical observations instead of overwriting the latest row.
- Support one provider adapter behind a provider interface.
- Preserve manual prices and allow them to override provider values.
- Provide deterministic tests with a fake provider.
- Keep the application local-only; no authentication, multi-device sync, or deployment work.

## Non-goals

- Foreign-exchange conversion.
- Dividends, splits, taxes, or corporate actions.
- Portfolio-level multi-currency accounting.
- Provider-specific data exposed directly in API contracts.
- Multiple simultaneous providers or provider failover.

## Prerequisites

The POC must already provide:

- `Portfolio.Currency`, immutable after creation.
- `PriceObservation` records with `Ticker`, `Currency`, `Price`, `EffectiveAt`, and `CreatedAt`.
- Manual price observation CRUD.
- Current-price selection using the newest non-future observation.
- Price history ordered newest first.
- Ticker normalization and portfolio-currency validation.
- Portfolio summary tests covering manual prices and FIFO accounting.

## Design

### Provider abstraction

Define a provider contract that returns a normalized quote rather than a provider response:

```csharp
public interface IMarketPriceProvider
{
    Task<MarketQuote?> GetCurrentAsync(
        string ticker,
        string currency,
        CancellationToken cancellationToken);
}

public record MarketQuote(
    string Ticker,
    string Currency,
    decimal Price,
    DateTimeOffset EffectiveAt,
    string ProviderSymbol);
```

The application must not construct provider symbols from currency codes. Provider-specific mapping must use explicit instrument metadata such as exchange or market.

### Instrument mapping

Add a mapping seam before enabling live fetching:

- Canonical application ticker.
- Provider symbol.
- Exchange or market.
- Quote currency.
- Active/inactive flag.

If a ticker has no unambiguous provider mapping, skip it and record a warning. Never guess an exchange suffix.

### Persistence

Store each successful provider observation as a historical record.

Recommended fields:

- `Id`
- `Ticker`
- `Currency`
- `Price`
- `EffectiveAt`
- `CreatedAt`
- `Source`
- `ProviderSymbol`

Use an index on `(Ticker, Currency, EffectiveAt)` and a source-aware deduplication strategy. Do not use a unique `(Ticker, Currency)` constraint because it prevents history.

Manual and provider observations share the same history. Current-price selection must apply this precedence:

1. A non-future manual observation newer than all provider observations wins.
2. Otherwise, the newest non-future provider observation wins.
3. If no valid observation exists, the summary reports no current price rather than treating it as zero.

### Background worker

Implement a hosted worker that:

1. Creates a fresh dependency-injection scope per run.
2. Loads distinct tracked ticker/currency mappings.
3. Fetches with a bounded concurrency limit.
4. Applies provider rate limits.
5. Stores successful observations.
6. Logs failures per ticker and continues with other tickers.
7. Honors cancellation during waits and network calls.
8. Uses configurable interval, timeout, retry count, and backoff.

The worker must not hold an EF `DbContext` or mutable cache across iterations.

### Manual refresh

Do not make the portfolio summary perform network calls. The normal read path remains deterministic and cached in the database.

If a development-only refresh trigger is needed, expose it as an explicit command with authorization limited to local development. It must report per-ticker success/failure and must not bypass provider rate limits.

## Configuration

Use local development configuration or user secrets for provider settings:

```json
{
  "MarketData": {
    "Enabled": false,
    "Provider": "<provider-name>",
    "IntervalMinutes": 30,
    "RequestTimeoutSeconds": 10,
    "MaxConcurrency": 2,
    "MaxRetries": 2
  }
}
```

API keys must not be committed. The worker is disabled by default until a provider and symbol mapping are configured.

## Testing

Required tests:

- Provider response maps to `MarketQuote` correctly.
- Malformed or missing provider data is rejected.
- Provider failures do not remove existing observations.
- One failed ticker does not stop the batch.
- Retry count and cancellation are honored.
- Manual observations retain precedence over provider observations.
- Future observations are excluded from current-price selection.
- Duplicate provider observations do not create uncontrolled duplicates.
- Portfolio summaries remain deterministic when the provider is unavailable.
- No automated test calls the live provider.

Use a fake `IMarketPriceProvider`, an isolated SQLite database, and a controlled clock where time affects behavior.

## Acceptance criteria

Phase 2 is complete when:

1. A configured ticker is fetched on the configured schedule.
2. Successful fetches create historical provider observations.
3. Current-price reads use the newest valid observation with manual precedence.
4. Provider failures are visible in structured logs and do not break portfolio summaries.
5. Rate limits, retries, timeout, and cancellation are covered by tests.
6. The application still starts and works with automatic fetching disabled.
7. No provider-specific symbol or response shape leaks into the public API.

## Execution order

1. Add provider-neutral observation/source fields and migration.
2. Add provider-symbol mapping and validation.
3. Implement the provider interface and one adapter.
4. Implement the scoped background worker.
5. Add configuration, logging, retry, timeout, and concurrency controls.
6. Add fake-provider tests and integration tests.
7. Enable the worker only in an explicitly configured local environment.
8. Run the full POC smoke path with the provider both enabled and disabled.
