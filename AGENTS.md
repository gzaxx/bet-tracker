# AI Agent Instructions — Bet Tracker

## Project Overview

**Bet Tracker** is a proof of concept application to track gains and losses of stock trading. It is built with .NET 10, ReactJS, and SQLite.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Orchestration | .NET Aspire |
| Backend | .NET 10 (ASP.NET Core) with Wolverine (CQRS) |
| Frontend | ReactJS + Vite |
| Database | SQLite with Entity Framework Core |
| Language | C# (backend), TypeScript (frontend) |

## Architecture Guidelines

### Backend (.NET 10)

- Use **Vertical Slice Architecture** — each feature lives in its own folder under `Features/`.
- Use **Wolverine** for CQRS — no MediatR needed. Handlers use `[WolverineHttpGet]`, `[WolverineHttpPost]` attributes.
- Follow clean architecture principles: one feature = one folder, no shared services for business logic.
- Use dependency injection for all service registrations.
- Entity Framework Core with SQLite for data access.
- Use DTOs (Data Transfer Objects) for API request/response contracts.
- Implement proper error handling with problem details responses (`ProblemDetails`).
- Use async/await throughout for I/O-bound operations.
- Auto-discover handlers with `app.MapWolverineEndpoints()` — no manual endpoint mapping.

### Frontend (ReactJS)

- Use functional components with hooks (no class components).
- Use TypeScript for new components where possible.
- Organize components by feature, not by type.
- Use a consistent state management approach (React Context or Zustand for simple state; avoid over-engineering).
- Use Axios or fetch for API calls, centralized in a services layer.
- Implement proper loading and error states for all async operations.
- Use reusable UI components and keep components small and focused.

### Database (SQLite)

- Use Entity Framework Core migrations for schema changes.
- Define models with appropriate data annotations or Fluent API configuration.
- Use seed data for development/testing where appropriate.
- SQLite is file-based; ensure the database file is in `.gitignore`.

## Coding Conventions

### C#

- Use C# 13 features available in .NET 10.
- Follow Microsoft C# coding conventions.
- Use `record` types for DTOs and immutable data.
- Use `init` properties where appropriate.
- Prefer `var` when the type is obvious.
- Use nullable reference types (`<Nullable>enable</Nullable>`).
- Use `partial` classes to organize large files.

### React/TypeScript

- Use arrow functions for component definitions.
- Define explicit types for props and state.
- Use custom hooks for reusable logic.
- Prefer composition over inheritance.

## API Design

- RESTful conventions: `GET /api/trades`, `POST /api/trades`, `PUT /api/trades/{id}`, `DELETE /api/trades/{id}`.
- Version APIs under `/api/v1/...` if changes are expected.
- Return appropriate HTTP status codes (200, 201, 400, 404, 500).
- Use pagination for list endpoints.

## Security

- Validate all input on the backend.
- Use parameterized queries (EF Core handles this automatically).
- Implement CORS properly for the React frontend.
- Never expose sensitive data in API responses.

## Testing

- Write unit tests for services and business logic (xUnit or NUnit).
- Write integration tests for API endpoints.
- Use in-memory SQLite for testing.

## Project Structure (Suggested)

```
bet-tracker/
├── services/App/
│   ├── BetTracker.AppHost/       # .NET Aspire orchestration
│   │   └── Program.cs
│   ├── BetTracker.ApiService/    # ASP.NET Core Web API
│   │   ├── Features/             # Vertical slices
│   │   │   ├── Trades/
│   │   │   │   ├── CreateTrade.cs
│   │   │   │   ├── GetTrades.cs
│   │   │   │   └── TradeEndpoints.cs
│   │   │   └── Portfolio/
│   │   ├── Common/
│   │   │   ├── Dependencies.cs
│   │   │   └── Middleware/
│   │   ├── Data/
│   │   │   ├── AppDbContext.cs
│   │   │   └── Migrations/
│   │   └── Program.cs
│   └── BetTracker.Database/      # EF Core entities (optional)
│       └── Entities/
├── apps/
│   └── bet-tracker-client/       # React + Vite
│       ├── src/
│       │   ├── components/
│       │   ├── services/
│       │   ├── hooks/
│       │   ├── pages/
│       │   ├── types/
│       │   ├── App.tsx
│       │   └── main.tsx
│       ├── vite.config.ts
│       └── package.json
├── tests/
│   ├── BetTracker.Api.Tests/
│   └── bet-tracker-client.tests/
├── SKILLS/
│   ├── dotnet/SKILL.md
│   └── reactjs/SKILL.md
├── README.md
└── agents.md
```

## Commit Message Convention

Use conventional commits:

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation changes
- `refactor:` — code refactoring
- `test:` — test additions/changes
- `chore:` — maintenance tasks

## Agent Behavior

- Be **concise** in responses — avoid unnecessary explanations and get straight to the point.
- **Grammar mistakes are acceptable** as long as they don't impact code quality or clarity.
- Prioritize functional, working code over perfect prose.
- If a decision is obvious, don't over-explain it.

## Notes

- This is a **proof of concept** — prioritize simplicity and clarity over enterprise-grade complexity.
- Keep dependencies minimal.
- Document any non-obvious design decisions inline or in a `docs/` folder.
