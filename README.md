# Bet Tracker

Bet Tracker is a local-only proof of concept for recording long-only stock trades and calculating FIFO portfolio performance with manual prices.

## Requirements

- .NET 10 SDK
- Node.js and npm
- A browser

No external market-data service or account is required. Development startup applies the SQLite migrations automatically.

## Clean-start verification

From the repository root:

```powershell
dotnet restore
dotnet build BetTracker.sln
dotnet test BetTracker.sln --no-restore

Push-Location apps/bet-tracker-client
npm ci
npm run typecheck
npm run build
Pop-Location
```

The local SQLite database is created at `services/App/BetTracker.ApiService/data/bettracker.db`. Database files, build output, `node_modules`, local environment files, and secrets are ignored by Git.

## Run locally

The simplest run starts the API and React frontend through .NET Aspire:

```powershell
dotnet run --project services/App/BetTracker.AppHost/BetTracker.AppHost.csproj
```

Open the frontend URL shown by the Aspire dashboard. The app supports:

1. Create a profile and portfolio.
2. Add buy and sell trades.
3. Add current or historical manual prices.
4. View FIFO holdings and realized/unrealized P&L.

For a direct two-process run, start the API first:

```powershell
dotnet run --project services/App/BetTracker.ApiService/BetTracker.ApiService.csproj
```

Then, in a second terminal:

```powershell
Push-Location apps/bet-tracker-client
npm ci
npm run dev
Pop-Location
```

The Vite proxy targets `http://localhost:5283` by default. Set `VITE_API_PROXY_TARGET` when the API uses another address:

```powershell
$env:VITE_API_PROXY_TARGET = "http://localhost:6000"
npm run dev
```

Automatic market-price fetching is intentionally disabled. All prices used by the POC are entered locally through the manual price history UI.

## Tech stack

| Layer | Technology |
|-------|------------|
| Orchestration | .NET Aspire |
| Backend | .NET 10, ASP.NET Core, Wolverine |
| Frontend | React, TypeScript, Vite |
| Database | SQLite with Entity Framework Core |

## Architecture

- **Vertical slices** — each backend feature is self-contained under `Features/`
- **CQRS with Wolverine** — HTTP handlers are discovered automatically
- **DTO contracts** — API handlers never expose EF entities
- **Local persistence** — migrations and the development database are local-only