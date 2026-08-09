---
name: dotnet
description: .NET 10 development guidance including ASP.NET Core APIs with .NET Aspire orchestration, Entity Framework Core with SQLite, Vertical Slice Architecture with CQRS using Wolverine, minimal APIs, dependency injection, testing with xUnit, and C# 13 best practices. Use when building or modifying backend code.
---

# .NET 10 Development — Vertical Slice Architecture with CQRS

## Project Structure

```
bet-tracker/
├── services/ App/                # .NET Aspire AppHost
│   ├── BetTracker.AppHost/       # Aspire orchestration entry point
│   │   └── Program.cs            # Defines services and projects
│   ├── BetTracker.ApiService/    # ASP.NET Core Web API
│   │   ├── Features/             # Vertical slices (feature-based)
│   │   │   ├── Trades/           # Feature folder
│   │   │   │   ├── CreateTrade.cs        # Command + Handler
│   │   │   │   ├── GetTrades.cs          # Query + Handler
│   │   │   │   ├── GetTradeById.cs       # Query + Handler
│   │   │   │   └── DeleteTrade.cs        # Command + Handler
│   │   │   └── Portfolio/        # Another feature
│   │   │       ├── GetPortfolioSummary.cs
│   │   │       └── ... 
│   │   ├── Common/               # Cross-cutting concerns
│   │   │   ├── Dependencies.cs   # DI registration
│   │   │   ├── Exceptions/       # Custom exceptions
│   │   │   └── Middleware/       # Global error handling
│   │   ├── Data/                 # EF Core
│   │   │   ├── AppDbContext.cs
│   │   │   └── Migrations/
│   │   └── Program.cs            # App configuration
│   └── BetTracker.Database/      # EF Core models (optional)
│       └── Entities/
└── apps/                         # Frontend
    └── bet-tracker-client/       # React + Vite
```

## Key Principles

- **One feature = one folder** — all code for a feature lives together
- **No shared services for business logic** — keep features independent
- **Commands and Queries** — use Wolverine for CQRS and message handling
- **Handlers are single-responsibility** — each handler does one thing
- **FluentValidation** — validate inputs per feature
- **Wolverine auto-discovers handlers** — no manual registration needed

## Wolverine Packages

```bash
dotnet add package WolverineFx
```

## Wolverine vs MediatR

Wolverine provides built-in CQRS support with better performance, built-in messaging, observability, and persistence out of the box. No need for MediatR.

## .NET Aspire Orchestration

Aspire manages service discovery, health checks, and local development orchestration.

```csharp
// BetTracker.AppHost/Program.cs
var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.BetTracker_ApiService>("api");

builder.AddPostgres("postgres")
    .WithPgAdmin()
    .AddDatabase("db");

builder.AddProject<Projects.BetTracker_Web>("web")
    .WithReference(api);

builder.Build().Run();
```

## Dependency Registration

```csharp
// BetTracker.ApiService/Program.cs
var builder = WebApplication.CreateBuilder(args);

// Wolverine with CQRS
builder.Services.AddWolverine()
    .WithOptions(o => o.ApplicationName = "BetTracker");

// EF Core with SQLite
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// Map feature endpoints
app.MapTrades();

app.Run();
```

## Wolverine Configuration

```csharp
// BetTracker.ApiService/Features/Trades/TradesPolicy.cs
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Trades;

[ WolverineModule ]
public class TradesPolicy
{
    // Wolverine auto-discovers handlers from this assembly
    // No manual registration needed
}
```

## Vertical Slice Example — Create Trade

```csharp
// Features/Trades/CreateTrade.cs
using Wolverine.Attributes;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Trades;

// Request DTO
public record CreateTradeRequest(string Symbol, decimal Quantity, decimal BuyPrice, DateTime TradeDate);

// Response DTO
public record CreateTradeResponse(int Id, string Symbol, decimal GainLoss);

// Handler — Wolverine auto-discovers this
[ WolverineHttpPost("/api/trades") ]
public class CreateTradeHandler
{
    private readonly AppDbContext _db;

    public CreateTradeHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<CreateTradeResponse> HandleAsync(CreateTradeRequest request)
    {
        var trade = new Trade
        {
            Symbol = request.Symbol,
            Quantity = request.Quantity,
            BuyPrice = request.BuyPrice,
            TradeDate = request.TradeDate
        };

        _db.Trades.Add(trade);
        await _db.SaveChangesAsync();

        return new CreateTradeResponse(trade.Id, trade.Symbol, trade.GainLoss);
    }
}
```

## Vertical Slice Example — Get Trades

```csharp
// Features/Trades/GetTrades.cs
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Trades;

public record TradeResponse(int Id, string Symbol, decimal GainLoss);

// GET handler — Wolverine auto-discovers this
[ WolverineHttpGet("/api/trades") ]
public class GetTradesHandler
{
    private readonly AppDbContext _db;

    public GetTradesHandler(AppDbContext db)
    {
        _db = db;
    }

    public async Task<IResult> HandleAsync()
    {
        var trades = await _db.Trades
            .Select(t => new TradeResponse(t.Id, t.Symbol, t.GainLoss))
            .ToListAsync();

        return Results.Ok(trades);
    }
}
```

## Endpoint Mapping

With Wolverine, endpoints are auto-discovered via attributes. No manual endpoint mapping needed.

```csharp
// BetTracker.ApiService/Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddWolverine();
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlite(builder.Configuration.GetConnectionString("Default")));

var app = builder.Build();

// Wolverine auto-discovers [WolverineHttp] handlers
app.MapWolverineEndpoints();

app.Run();
```

## Entity

```csharp
// Data/Entities/Trade.cs
namespace BetTracker.ApiService.Data.Entities;

public class Trade
{
    public int Id { get; init; }
    public string Symbol { get; init; } = string.Empty;
    public decimal Quantity { get; init; }
    public decimal BuyPrice { get; init; }
    public decimal SellPrice { get; init; }
    public DateTime TradeDate { get; init; }
    public decimal GainLoss => (SellPrice - BuyPrice) * Quantity;
}
```

## DbContext

```csharp
// Data/AppDbContext.cs
using Microsoft.EntityFrameworkCore;

namespace BetTracker.ApiService.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Trade> Trades => Set<Trade>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        // Entity configurations
        builder.Entity<Trade>(entity =>
        {
            entity.HasKey(t => t.Id);
            entity.Property(t => t.Symbol).IsRequired().HasMaxLength(10);
        });
    }
}
```

## EF Core Tips

- Use `UseSqlite()` for local development
- Add migrations: `dotnet ef migrations add Name --project BetTracker.ApiService`
- Update database: `dotnet ef database update --project BetTracker.ApiService`
- Seed data in `OnModelCreating()` or a separate seeder
- Use `Aspire.Microsoft.EntityFrameworkCore.Sqlite` for Aspire integration

## Testing

```csharp
public class CreateTradeHandlerTests
{
    [Fact]
    public async Task HandleAsync_ValidRequest_ReturnsResponse()
    {
        // Arrange
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase("TestDb")
            .Options;

        using var context = new AppDbContext(options);
        var handler = new CreateTradeHandler(context);
        var request = new CreateTradeRequest("AAPL", 10, 150.00, DateTime.UtcNow);

        // Act
        var result = await handler.HandleAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("AAPL", result.Symbol);
    }
}
```

Use xUnit, in-memory SQLite or EF In-Memory database for tests.

## Wolverine Benefits over MediatR

- **Built-in HTTP handlers** — `[WolverineHttpGet]`, `[WolverineHttpPost]` etc.
- **Auto-discovery** — no manual handler registration
- **Built-in messaging** — publish/subscribe, event sourcing
- **Observability** — built-in metrics and tracing
- **Persistence** — built-in envelope persistence for reliability
- **Better performance** — no reflection overhead
