# Bet Tracker

Bet Tracker is a proof of concept application to track gains and losses of stock trading.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Orchestration | .NET Aspire |
| Backend | .NET 10 (ASP.NET Core) with Wolverine (CQRS) |
| Frontend | ReactJS + Vite |
| Database | SQLite with Entity Framework Core |
| Language | C# (backend), TypeScript (frontend) |

## Architecture

- **Vertical Slice Architecture** — each feature is self-contained
- **CQRS with Wolverine** — built-in HTTP handlers and message support
- **Minimal APIs** — lightweight, attribute-based endpoint discovery