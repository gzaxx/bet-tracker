---
name: dotnet
description: .NET 10 development guidance for Bet Tracker — Vertical Slice Architecture, Wolverine CQRS, EF Core with SQLite, and testing conventions.
---

# .NET 10 — Bet Tracker Conventions

## Vertical Slice

One feature = one folder. All code for a feature lives together: command, handler, DTOs. No shared services for business logic.

```
Features/Trades/
  CreateTrade.cs        // Request DTO + Handler
  GetTrades.cs          // Query DTO + Handler
  GetTradeById.cs
  DeleteTrade.cs
```

## CQRS (Wolverine)

Wolverine auto-discovers handlers via attributes. No manual registration. No MediatR.

```csharp
[WolverineHttpGet("/api/trades")]
public class GetTradesHandler(AppDbContext db) { /* return projection */ }

[WolverineHttpPost("/api/trades")]
public class CreateTradeHandler(AppDbContext db) { /* mutate + return */ }
```

Commands mutate state. Queries read state. Handlers are single-responsibility.

## DTOs

Use `record` types. Never expose entities directly. Project in the handler.

```csharp
public record TradeResponse(int Id, string Symbol, decimal GainLoss);
```

## Validation

FluentValidation per feature. Validators named `{Command}Validator`.

```csharp
public class CreateTradeValidator : AbstractValidator<CreateTradeRequest>
{
    RuleFor(x => x.Symbol).NotEmpty().MaximumLength(10);
    RuleFor(x => x.Quantity).GreaterThan(0);
}
```

## Error Handling

Return `Results.BadRequest(ProblemDetails)` for validation failures. Global error middleware in `Common/Middleware/` catches unhandled exceptions. Never let raw exceptions reach the client.

## Database

EF Core with SQLite. Entities in `Data/Entities/`. DbContext in `Data/AppDbContext.cs`. Migrations via `dotnet ef migrations add`.

Seed data in `OnModelCreating()` or a dedicated seeder.

## Testing

xUnit. In-memory SQLite or EF In-Memory database. Test handlers directly — no integration layer needed for unit tests.

## Anti-patterns

- ❌ Shared `Services/TradesService.cs` — logic belongs in handlers
- ❌ Manual endpoint mapping — let Wolverine discover
- ❌ Entity properties exposed directly — always project to DTOs
- ❌ Business logic in controllers or middleware
- ❌ Shared commands/queries across features
