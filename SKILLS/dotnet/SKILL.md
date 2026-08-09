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

## Async Always

Always use `async`/`await` for I/O-bound operations. Never block on async code (`Result` or `.Wait()`). All EF Core calls, HTTP calls, and file I/O must be async.

```csharp
[WolverineHttpGet("/api/trades")]
public class GetTradesHandler(AppDbContext db) : IHttpHandler
{
    public async Task<List<TradeResponse>> Handle(CancellationToken ct)
    {
        return await db.Trades.ToListAsync(ct);
    }
}
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

## API Design — Strict RESTful

Strictly follow REST conventions. No custom actions, no query-string mutations, no camelCase endpoints.

| Action   | Method   | Endpoint          | Handler Attribute     | Return              |
|----------|----------|-------------------|-----------------------|---------------------|
| List     | `GET`    | `/api/trades`     | `[WolverineHttpGet]`  | `IEnumerable<T>`    |
| Get      | `GET`    | `/api/trades/{id}`| `[WolverineHttpGet]`  | `T` or `NotFound`   |
| Create   | `POST`   | `/api/trades`     | `[WolverineHttpPost]` | `Created<T>`        |
| Update   | `PUT`    | `/api/trades/{id}`| `[WolverineHttpPut]`  | `OK<T>` or `NotFound`|
| Delete   | `DELETE` | `/api/trades/{id}`| `[WolverineHttpDelete]`| `NoContent` or `NotFound`|

**Rules:**
- Resource names in **plural** (`/api/trades`, not `/api/trade`)
- Use **snake_case** or **kebab-case** for nested resources (`/api/trades/{id}/positions`)
- `POST` for creation, `PUT` for full updates, `PATCH` for partial (if needed)
- Return proper HTTP status codes: `200 OK`, `201 Created`, `204 NoContent`, `400 BadRequest`, `404 NotFound`
- Never use GET for mutations, never use POST for reads
- Route templates use `{id}` for single resource lookups

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

## Services — Code Smell

`Services/` folders are a code smell. Handlers are your primary unit of logic. If a handler needs to be split, extract into a **highly specialized class** with a single responsibility — name it by what it *does*, not what it *is*:

- ✅ `UserDeleter` — deletes a user and cleans up related data
- ✅ `UserUpdater` — updates user profile with audit logging
- ✅ `UserProvider` — fetches user with complex joins/caching

Never create generic `IUserService`, `ITradeService`, or `Repository` classes.

## Anti-patterns

- ❌ `Services/TradesService.cs` — logic belongs in handlers
- ❌ Manual endpoint mapping — let Wolverine discover
- ❌ Entity properties exposed directly — always project to DTOs
- ❌ Business logic in controllers or middleware
- ❌ Shared commands/queries across features
- ❌ Blocking async code (`.Result`, `.Wait()`)
- ❌ Generic service/repository abstractions
- ❌ Non-RESTful endpoints (`/api/trades/getAll`, `/api/trades/delete?id=5`)
- ❌ Singular resource names (`/api/trade`)
- ❌ Custom action verbs in routes (`/api/trades/createTrade`)
