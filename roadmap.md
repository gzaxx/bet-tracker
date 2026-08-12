# Bet Tracker Implementation Roadmap

This file is the execution source of truth for the local POC. The first incomplete phase is the current phase. An agent must complete that phase's acceptance criteria before starting a later phase.

Existing `BACKEND_PLAN.md` and `FRONTEND_PLAN.md` are reference material only. Their examples contain known contract and accounting defects; do not execute them verbatim.

## Current phase

**Phase 4 — Manual Price History**

After completing a phase, update this section to the next incomplete phase and record the verification command/results in the phase's handoff notes.

## Agent execution loop

For the current phase:

1. Read the repository instructions and the current phase completely.
2. Inspect existing files and reuse established patterns.
3. Implement only the current phase's scope and its required tests.
4. Run the phase verification commands and exercise the stated smoke path.
5. Fix failures at the source.
6. Update the phase status and handoff notes only after every acceptance criterion passes.
7. Leave later phases untouched unless a dependency must be created explicitly.

A phase is complete only when its acceptance criteria are observable, its tests pass, and the repository still builds from a clean checkout.

## Locked product decisions

- Local-only, single-user proof of concept.
- Multiple local profiles with profile switching.
- Long-only ticker-based trades.
- FIFO cost basis.
- Buy commissions increase lot cost basis.
- Sell commissions reduce realized proceeds.
- No dividends, splits, taxes, shorting, or FX conversion in the POC.
- Every portfolio has one immutable reporting currency.
- Every trade and price observation must use its portfolio currency.
- Trades use a UTC `ExecutedAt` timestamp for deterministic ordering.
- Manual current and historical prices are supported.
- Future trade and price timestamps are rejected.
- Historical trade edits/deletes recalculate the full history and reject invalid resulting positions.
- Successful API responses use bare DTOs or arrays.
- Errors use RFC-compatible `ProblemDetails`.
- Automatic market-price fetching is deferred to the post-POC phase documented in `AUTOMATIC_PRICE_FETCH_PLAN.md`.
- Development migrations are automatic; production deployment and authentication are out of scope.

## Cross-cutting rules

### Backend

- .NET 10, ASP.NET Core, Wolverine, EF Core SQLite.
- Vertical slices under `Features/`.
- Async I/O throughout; pass cancellation tokens to database and HTTP calls.
- Handlers return DTOs, never EF entities.
- Validators are per command and reject invalid input before mutation.
- Use `DateTimeOffset`/UTC for event timestamps where time ordering matters.
- Keep business logic in feature handlers or narrowly named specialized classes.

### Frontend

- React, TypeScript, Vite, functional components, hooks.
- API calls stay in the services layer.
- Every async path has loading, error, and success handling.
- Use explicit API contract types; do not use `any` for domain data.
- Handle `204 No Content` without attempting JSON parsing.
- Use the portfolio currency for every monetary display; never hardcode PLN.

### Verification

- Backend unit tests cover validation and accounting invariants.
- Backend integration tests use isolated SQLite.
- Frontend build/type checks run for every UI phase.
- No automated test depends on a live external network service.
- Run the complete local smoke path before declaring the POC complete.

# Phase 0 — Scaffolding

**Status:** Complete

## Goal

Create buildable backend, frontend, orchestration, and test projects with pinned dependencies and local SQLite configuration.

## Work

- Create `BetTracker.sln`.
- Create `services/App/BetTracker.ApiService` targeting .NET 10.
- Create `services/App/BetTracker.AppHost` targeting the compatible Aspire version.
- Create `tests/BetTracker.Api.Tests` and reference the API project.
- Create `apps/bet-tracker-client` from the React TypeScript Vite template.
- Add only the selected, pinned dependencies required by the project.
- Configure Aspire to launch the API.
- Configure Vite `/api` proxy against the actual local API endpoint; do not assume an unexplained fixed port.
- Configure development SQLite at `data/bettracker.db`.
- Add database files and local secrets to `.gitignore`.
- Add baseline logging, CORS for the configured frontend origin, and ProblemDetails services.
- Add a minimal health/startup path.
- Add initial build/test scripts without implementing domain features.

## Acceptance

- `dotnet build BetTracker.sln` succeeds.
- `dotnet test BetTracker.sln` succeeds with at least one real test-project smoke test.
- Frontend dependency installation succeeds from the committed lockfile.
- Frontend typecheck/build succeeds.
- Aspire starts the API and the frontend proxy reaches the API.
- No SQLite database file or secret is tracked.

## Handoff

Phase 0 verification completed on 2026-08-11:

- Solution: `BetTracker.sln`.
- Projects: `services/App/BetTracker.ApiService/BetTracker.ApiService.csproj`, `services/App/BetTracker.AppHost/BetTracker.AppHost.csproj`, and `tests/BetTracker.Api.Tests/BetTracker.Api.Tests.csproj`.
- Backend packages: `Microsoft.EntityFrameworkCore.Sqlite.Core` `10.0.10`, `SQLitePCLRaw.provider.e_sqlite3` `2.1.11`, `SourceGear.sqlite3` `3.53.4`, `WolverineFx.Http` `6.25.5`, `WolverineFx.RuntimeCompilation` `6.25.5`, `Aspire.Hosting.AppHost` `13.4.6`, and `Microsoft.AspNetCore.Mvc.Testing` `10.0.10`.
- Frontend packages are pinned in `apps/bet-tracker-client/package.json` and `package-lock.json`; Node-compatible Vite `6.3.5` and React `19.0.0` are used.
- `dotnet build BetTracker.sln` passed.
- `dotnet test BetTracker.sln --no-build` passed with two API smoke tests, including opening an in-memory SQLite connection.
- `npm ci` passed from `apps/bet-tracker-client` using the committed lockfile.
- `npm run typecheck && npm run build` passed from `apps/bet-tracker-client` after the clean install.
- `dotnet run --project services/App/BetTracker.AppHost/BetTracker.AppHost.csproj --no-build` started Aspire and its `api` resource.
- `curl http://localhost:5283/api/v1/health` returned `Healthy`.
- Vite proxy smoke: `curl http://localhost:5173/api/v1/health` returned `Healthy`.
- CORS smoke from `http://localhost:5173` returned `Access-Control-Allow-Origin`.
- The vulnerable `SQLitePCLRaw.lib.e_sqlite3` package is absent from the resolved graph; the native SQLite build comes from `SourceGear.sqlite3` `3.53.4`.

Phase 1 is the next implementation phase.

# Phase 1 — Domain and Persistence

**Status:** Complete

## Goal

Define the persisted domain and API contracts required by every later feature.

## Work

Create the following entities under `Data/Entities/`:

- `Profile`: name, default currency, timestamps.
- `Portfolio`: profile ID, name, immutable currency, timestamps.
- `Trade`: portfolio ID, normalized ticker, buy/sell type, shares, price, commission, `ExecutedAt`, notes, optional ISIN, currency.
- `PriceObservation`: ticker, currency, price, `EffectiveAt`, `CreatedAt`, source, optional provider symbol.
- `ETF`: optional reference metadata only; it must not be required for a trade.

Then:

- Configure required fields, lengths, precision, indexes, and cascade behavior.
- Use a non-unique price-observation history index; never constrain `(Ticker, Currency)` to one row.
- Add complete record DTOs for all public resources and request contracts.
- Add per-command validators for required fields, ranges, normalization, currencies, and future timestamps.
- Add the initial EF migration.
- Add an isolated SQLite test fixture.
- Add deterministic clock/test helpers where timestamp behavior is tested.

## Acceptance

- Migration creates the complete schema from an empty database.
- Portfolio currency is required and immutable after creation.
- Trade and price currency validation is represented in tests.
- DTOs compile without exposing entities.
- Precision and timestamp ordering behavior have tests.
- A test can create a profile, portfolio, trade, and price observation in isolated SQLite.

## Handoff

Phase 1 verification completed on 2026-08-11:

- `Data/Entities/` contains `Profile`, `Portfolio`, `Trade`, `PriceObservation`, and optional-reference `ETF`; portfolio-to-trade and profile-to-portfolio relationships cascade on delete.
- `PriceObservations` has the non-unique index `(Ticker, Currency, EffectiveAt)`. UTC timestamps are persisted as sortable ticks so SQLite can order `ExecutedAt` and `EffectiveAt`.
- `Contracts/Resources.cs` defines `ProfileDto`, `PortfolioDto`, `TradeDto`, `PriceObservationDto`, and `ETFDto`, plus create/update request records. DTOs contain no EF navigation properties.
- `Contracts/Validation/RequestValidation.cs` defines per-command validators, identifier/currency normalization, numeric range checks, and deterministic future-timestamp checks.
- `Data/Migrations/20260811170121_InitialCreate.cs` creates the complete schema from an empty database. Development startup applies migrations automatically.
- `SqliteTestDatabase` uses an isolated in-memory SQLite connection and `FixedClock`.
- `dotnet build BetTracker.sln` passed with zero warnings and errors.
- `dotnet test BetTracker.sln --no-restore` passed: 8 tests.
- `npm run typecheck && npm run build` passed in `apps/bet-tracker-client`.

Phase 2 is complete. Phase 3 is now the current implementation phase.

# Phase 2 — Profiles and Portfolios

**Status:** Complete

## Goal

Provide the first complete vertical slice: create a local profile, create a portfolio, and select it in the UI.

## Work

Backend:

- Profile list/get/create/update/delete.
- Portfolio list/get/create/update/delete.
- Copy the profile default currency into a new portfolio.
- Reject attempts to change portfolio currency.
- Cascade profile deletion only through an explicit command and UI confirmation.
- Return bare DTOs and arrays with correct status codes.

Frontend:

- Active-profile context with local persistence.
- Profile switching.
- Onboarding form for the first profile and portfolio.
- Dashboard showing portfolios and their currencies.
- Loading, error, empty, and delete-confirmation states.

## Acceptance

- A clean local run supports profile creation followed by portfolio creation.
- Refreshing the browser restores the selected profile.
- A second profile can be created and selected.
- Portfolio currency is displayed and cannot be edited.
- API integration tests cover validation, not-found, duplicate, and cascade behavior.
- The frontend build passes.

## Handoff

Phase 2 verification completed on 2026-08-11:

- Backend profile and portfolio endpoints live under `/api/v1/profiles` and `/api/v1/portfolios`, return bare DTOs/arrays, and use `201`, `200`, `204`, `400`, `404`, and `409` responses as applicable.
- New portfolios copy the profile default currency. Update requests reject a changed portfolio currency, while profile deletion remains an explicit `DELETE` command with database cascade behavior.
- `Phase2ApiTests` covers creation/currency copy, validation, not-found, duplicate, immutable currency, profile cascade, and full CRUD behavior.
- `dotnet test tests/BetTracker.Api.Tests/BetTracker.Api.Tests.csproj --no-restore` passed: 13 tests.
- `npm run typecheck && npm run build` passed in `apps/bet-tracker-client`.
- Browser smoke from an empty local database passed: create profile and portfolio, create/select a second profile, refresh with selected profile restored, and display portfolio currency with delete confirmation controls.

# Phase 3 — Trades and FIFO Accounting

**Status:** Complete

## Goal

Record valid trades and enforce long-only FIFO inventory behavior.

## Work

Backend:

- Trade list/get/create/update/delete by portfolio.
- Normalize tickers before persistence.
- Validate positive shares and price, non-negative commission, matching currency, and non-future `ExecutedAt`.
- Sort trades by `ExecutedAt`, then trade ID.
- Implement FIFO lots using a queue or equivalent ordered structure.
- Include buy commissions in lot cost.
- Subtract sell commissions from realized proceeds.
- Recalculate all affected history after edits/deletes.
- Reject any operation that produces a negative position.

Frontend:

- Portfolio trade selection.
- Trade list with totals and currency.
- Create/edit form.
- Delete confirmation and refresh.
- Display API validation errors.

## Acceptance

Tests cover:

- A basic buy and sell.
- Partial consumption of a lot.
- Multiple lots proving FIFO rather than LIFO.
- Same-timestamp deterministic ordering.
- Buy and sell commissions.
- Invalid oversells.
- Editing a historical trade into an invalid state.
- Deleting a trade and recalculating later positions.
- Multiple tickers and portfolios.

The UI completes create, edit, list, and delete against the real API. Set the current phase to Phase 4 only after accounting tests and the frontend build pass.

## Handoff

Phase 3 verification completed on 2026-08-12:

- `/api/v1/portfolios/{portfolioId}/trades` supports list, get, create, update, and delete with normalized tickers, portfolio-currency enforcement, UTC timestamps, and RFC-compatible validation errors.
- `FifoAccountingCalculator` sorts by `ExecutedAt` then trade ID, consumes per-ticker lots FIFO, includes buy commissions in cost basis, subtracts sell commissions from proceeds, and rejects negative positions. Mutations run inside transactions and recalculate the complete portfolio history.
- `dotnet test tests/BetTracker.Api.Tests/BetTracker.Api.Tests.csproj --no-restore` passed: 24 tests.
- `dotnet build BetTracker.sln --no-restore` passed with zero warnings and errors.
- `npm run typecheck && npm run build` passed in `apps/bet-tracker-client`.
- Browser smoke against the real API passed: selected a portfolio, created a 10-share MSFT buy with a $5 commission, created a 4-share MSFT sell with a $2 commission, displayed $1,005 invested, $478 proceeds, and 6 open shares, edited the buy to 9 shares, rejected deletion that would oversell, and deleted the sell.

Phase 4 is now the current implementation phase.

# Phase 4 — Manual Price History

**Status:** Pending Phase 3

## Goal

Allow users to enter current and historical prices without a network dependency.

## API

Implement:

```text
GET    /api/v1/prices/{ticker}?currency=USD
GET    /api/v1/prices/{ticker}/history?currency=USD
POST   /api/v1/prices
PUT    /api/v1/prices/{id}
DELETE /api/v1/prices/{id}
```

Rules:

- Store every observation; do not overwrite history.
- Require matching portfolio currency where a portfolio context exists.
- Reject future `EffectiveAt` values.
- Current price is the newest non-future observation.
- Return no current price as an explicit missing value, never as zero.
- Use source `Manual` for UI-entered observations.

## Frontend

- Manual current-price form.
- Historical price list ordered newest first.
- Edit/delete controls.
- Loading, error, empty, and stale-price states.

## Acceptance

- A historical price can be added, edited, and deleted.
- Current-price selection ignores future observations.
- History retains multiple observations for one ticker/currency.
- Portfolio currency validation is enforced.
- The frontend build passes.

Set the current phase to Phase 5 after API and UI tests pass.

# Phase 5 — Portfolio Summary and P&L

**Status:** Pending Phase 4

## Goal

Calculate and display holdings, realized P&L, and unrealized P&L using manual prices.

## Work

Backend:

- Summary endpoint by portfolio.
- FIFO remaining lots and average cost.
- Current value from the latest valid price observation.
- Realized P&L from consumed lots and sell commissions.
- Unrealized P&L from current value minus remaining cost basis.
- Explicit missing-price behavior.
- Totals only within the portfolio currency.

Frontend:

- Summary cards using the portfolio currency.
- Holdings table.
- Realized/unrealized P&L display.
- Empty portfolio and missing-price states.
- Links back to dashboard and trades.

## Acceptance

- Summary totals match hand-calculated FIFO fixtures.
- Buy commissions, sell commissions, partial lots, and missing prices are covered by tests.
- No summary path performs network I/O.
- A user can complete the full smoke path:

```text
create profile → create portfolio → add buy → add sell → add price → view summary
```

Set the current phase to Phase 6 after backend integration tests, frontend build, and the full smoke path pass.

# Phase 6 — POC Completion and Hardening

**Status:** Pending Phase 5

## Goal

Make the local POC reliable and maintainable without expanding product scope.

## Work

- Add ETF reference CRUD only if the core smoke path is stable.
- Remove stale scaffold code and contradictory plan examples from active instructions.
- Verify all API responses and frontend types match exactly.
- Add endpoint not-found, validation, duplicate, and database-error coverage.
- Add a clean-start local run guide in the repository's existing documentation.
- Verify SQLite files, secrets, build output, and local caches remain ignored.
- Run backend tests, frontend typecheck/build, and the complete smoke path.

## Acceptance

- The POC works from an empty checkout using documented commands.
- No known contract mismatch remains between backend and frontend.
- All required tests and builds pass.
- The local smoke path is repeatable with automatic market fetching disabled.

After this phase, the local POC is complete. The next phase is deferred automatic pricing.

# Post-POC Phase 2 — Automatic Price Fetching

**Status:** Deferred

See `AUTOMATIC_PRICE_FETCH_PLAN.md` for the detailed plan. That document is authoritative for this phase.

## Entry criteria

- Phase 6 is complete.
- Manual current and historical price observations are stable.
- Portfolio summaries are deterministic without network access.
- `PriceObservation` history supports source and provider-symbol metadata.

## Scope

- Provider-neutral market-price interface.
- Explicit ticker/exchange/provider-symbol mapping.
- One provider adapter.
- Scoped scheduled worker.
- Historical provider observations.
- Manual-price precedence.
- Timeout, retry, cancellation, rate limiting, and bounded concurrency.
- Fake-provider tests; no live network in automated tests.

## Exit criteria

- Automatic fetching is disabled by default.
- Provider failures do not break summaries or erase existing observations.
- Successful fetches create historical observations.
- Manual observations retain precedence.
- Provider-specific response shapes do not leak into the public API.
- Enabled and disabled local smoke paths both pass.

## Explicitly deferred beyond this roadmap

- FX conversion.
- Dividends, splits, taxes, and corporate actions.
- Authentication and remote deployment.
- Multi-device synchronization.
- Multiple market-data providers or failover.
