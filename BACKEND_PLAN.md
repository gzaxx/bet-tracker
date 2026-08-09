# Backend Implementation Plan — Bet Tracker

> This plan is written for an AI coding agent. Each phase is self-contained and builds on the previous one. Follow the execution order.

---

## Phase 0: Project Scaffolding

### Goal
Create the .NET solution with Aspire orchestration, base configuration, and dependency wiring.

### Steps

#### 0.1 Create Solution & Projects

```bash
dotnet new sln -n BetTracker
dotnet new webapi -n BetTracker.ApiService -f net10.0
dotnet new aspire-apphost -n BetTracker.AppHost
dotnet new xunit -n BetTracker.Tests
dotnet sln add BetTracker.ApiService/BetTracker.ApiService.csproj
dotnet sln add BetTracker.AppHost/BetTracker.AppHost.csproj
dotnet sln add BetTracker.Tests/BetTracker.Tests.csproj
dotnet add BetTracker.AppHost reference BetTracker.ApiService/BetTracker.ApiService.csproj
```

#### 0.2 Add Packages to ApiService

```bash
cd BetTracker.ApiService
dotnet add package Microsoft.EntityFrameworkCore.Sqlite
dotnet add package EFCore.Sqlite.Core
dotnet add package WolverineFx
dotnet add package WolverineFx.Http
dotnet add package WolverineFx.AspNetCore
```

#### 0.3 Configure ApiService `appsettings.json`

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=bettracker.db"
  },
  "PriceFetcher": {
    "Enabled": true,
    "IntervalMinutes": 30,
    "DefaultCurrency": "PLN"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

#### 0.4 Configure `Program.cs`

Register in order:
1. EF Core `AppDbContext` with SQLite
2. Wolverine → `app.MapWolverineEndpoints()`
3. CORS policy → allow `http://localhost:5173` (React frontend)
4. ProblemDetails exception handling
5. API versioning → all routes prefixed with `/api/v1/`

```csharp
var builder = WebApplication.CreateBuilder(args);

// EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Wolverine
builder.Services.AddWolverine();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

var app = builder.Build();

app.UseCors("AllowFrontend");
app.MapWolverineEndpoints();

app.Run();
```

#### 0.5 Configure `AppHost/Program.cs`

```csharp
var builder = DistributedApplication.CreateBuilder(args);

var api = builder.AddProject<Projects.BetTracker_ApiService>("api");

builder.Build().Run();
```

---

## Phase 1: Domain Models & Database

### Goal
Define all entities, configure DbContext, create initial migration.

### Steps

#### 1.1 Create Entity Files

**`Data/Entities/Profile.cs`**
```csharp
namespace BetTracker.ApiService.Data.Entities;

public class Profile
{
    public int Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public string DefaultCurrency { get; set; } = "PLN";
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Portfolio> Portfolios { get; init; } = new List<Portfolio>();
}
```

**`Data/Entities/Portfolio.cs`**
```csharp
namespace BetTracker.ApiService.Data.Entities;

public class Portfolio
{
    public int Id { get; init; }
    public int ProfileId { get; set; }
    public Profile Profile { get; set; } = null!;
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public ICollection<Trade> Trades { get; init; } = new List<Trade>();
}
```

**`Data/Entities/Trade.cs`**
```csharp
namespace BetTracker.ApiService.Data.Entities;

public enum TradeType { Buy, Sell }

public class Trade
{
    public int Id { get; init; }
    public int PortfolioId { get; set; }
    public Portfolio Portfolio { get; set; } = null!;
    public string Ticker { get; set; } = string.Empty;
    public TradeType TradeType { get; set; }
    public decimal Shares { get; set; }
    public decimal Price { get; set; }
    public decimal Commission { get; set; }
    public DateTime TradeDate { get; set; }
    public string? Notes { get; set; }
    public string? Isin { get; set; }
    public string Currency { get; set; } = "PLN";
}
```

**`Data/Entities/ETF.cs`**
```csharp
namespace BetTracker.ApiService.Data.Entities;

public enum ETFType { Accumulating, Distributing }

public class ETF
{
    public int Id { get; init; }
    public string Ticker { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Exchange { get; set; }
    public ETFType Type { get; set; }
    public decimal? ExpenseRatio { get; set; }
    public string? Currency { get; set; }
    public string? Isin { get; set; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}
```

**`Data/Entities/Price.cs`**
```csharp
namespace BetTracker.ApiService.Data.Entities;

public class Price
{
    public int Id { get; init; }
    public string Ticker { get; set; } = string.Empty;
    public string Currency { get; set; } = "PLN";
    public decimal Price { get; set; }
    public DateTime FetchedAt { get; set; } = DateTime.UtcNow;
}
```

#### 1.2 Create `Data/AppDbContext.cs`

```csharp
using Microsoft.EntityFrameworkCore;

namespace BetTracker.ApiService.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Entities.Profile> Profiles => Set<Entities.Profile>();
    public DbSet<Entities.Portfolio> Portfolios => Set<Entities.Portfolio>();
    public DbSet<Entities.Trade> Trades => Set<Entities.Trade>();
    public DbSet<Entities.ETF> ETFs => Set<Entities.ETF>();
    public DbSet<Entities.Price> Prices => Set<Entities.Price>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Profile
        modelBuilder.Entity<Entities.Profile>(entity =>
        {
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.DefaultCurrency).HasMaxLength(3).HasDefaultValue("PLN");
            entity.HasIndex(e => e.Name).IsUnique();
        });

        // Portfolio
        modelBuilder.Entity<Entities.Portfolio>(entity =>
        {
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.HasOne(e => e.Profile).WithMany(e => e.Portfolios).HasForeignKey(e => e.ProfileId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.ProfileId, e.Name }).IsUnique();
        });

        // Trade
        modelBuilder.Entity<Entities.Trade>(entity =>
        {
            entity.Property(e => e.Ticker).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Shares).HasPrecision(18, 4).IsRequired();
            entity.Property(e => e.Price).HasPrecision(18, 4).IsRequired();
            entity.Property(e => e.Commission).HasPrecision(18, 4).HasDefaultValue(0m);
            entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("PLN");
            entity.HasOne(e => e.Portfolio).WithMany(e => e.Trades).HasForeignKey(e => e.PortfolioId).OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.PortfolioId, e.TradeDate });
        });

        // ETF
        modelBuilder.Entity<Entities.ETF>(entity =>
        {
            entity.Property(e => e.Ticker).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.HasIndex(e => e.Ticker).IsUnique();
        });

        // Price
        modelBuilder.Entity<Entities.Price>(entity =>
        {
            entity.Property(e => e.Ticker).HasMaxLength(20).IsRequired();
            entity.Property(e => e.Currency).HasMaxLength(3).HasDefaultValue("PLN");
            entity.Property(e => e.Price).HasPrecision(18, 4).IsRequired();
            entity.HasIndex(e => new { e.Ticker, e.Currency }).IsUnique();
        });
    }
}
```

#### 1.3 Create Initial Migration

```bash
dotnet ef migrations add InitialCreate --project BetTracker.ApiService --startup-project BetTracker.ApiService
```

#### 1.4 Create `Common/Dependencies.cs`

```csharp
using Microsoft.EntityFrameworkCore;
using BetTracker.ApiService.Data;

namespace BetTracker.ApiService.Common;

public static class Dependencies
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, IConfiguration config)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlite(config.GetConnectionString("DefaultConnection")));

        return services;
    }
}
```

Update `Program.cs` to call `Dependencies.AddApplicationServices(builder.Configuration)`.

---

## Phase 2: CQRS — Profiles & Portfolios

### Goal
Implement full CRUD for Profiles and Portfolios using Wolverine CQRS.

### 2.1 Profiles Feature

Create `Features/Profiles/` folder with these files:

**`Features/Profiles/GetProfiles.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Profiles;

public record GetProfilesResponse(IEnumerable<ProfileDto> Profiles);

[WolverineHttpGet("/api/v1/profiles")]
public static async Task<IResult> Handle(GetProfilesRequest request, AppDbContext db)
{
    var profiles = await db.Profiles.Select(p => new ProfileDto(
        p.Id, p.Name, p.DefaultCurrency, p.CreatedAt, p.UpdatedAt
    )).ToListAsync();
    return Results.Ok(new GetProfilesResponse(profiles));
}

public record GetProfilesRequest();
```

**`Features/Profiles/GetProfileById.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Profiles;

public record GetProfileByIdResponse(ProfileDto Profile);

[WolverineHttpGet("/api/v1/profiles/{id:int}")]
public static async Task<IResult> Handle(GetProfileByIdRequest request, AppDbContext db)
{
    var profile = await db.Profiles.FindAsync(request.Id);
    if (profile is null) throw new NotFoundException(nameof(Profile), request.Id);

    var dto = new ProfileDto(profile.Id, profile.Name, profile.DefaultCurrency, profile.CreatedAt, profile.UpdatedAt);
    return Results.Ok(new GetProfileByIdResponse(dto));
}

public record GetProfileByIdRequest(int Id);
```

**`Features/Profiles/CreateProfile.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Profiles;

public record CreateProfileRequest(string Name, string DefaultCurrency = "PLN");
public record CreateProfileResponse(ProfileDto Profile);

[WolverineHttpPost("/api/v1/profiles")]
public static async Task<IResult> Handle(CreateProfileRequest request, AppDbContext db)
{
    var profile = new Profile
    {
        Name = request.Name,
        DefaultCurrency = request.DefaultCurrency
    };
    db.Profiles.Add(profile);
    await db.SaveChangesAsync();

    var dto = new ProfileDto(profile.Id, profile.Name, profile.DefaultCurrency, profile.CreatedAt, profile.UpdatedAt);
    return Results.Created($"/api/v1/profiles/{profile.Id}", new CreateProfileResponse(dto));
}
```

**`Features/Profiles/UpdateProfile.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Profiles;

public record UpdateProfileRequest(string Name, string DefaultCurrency);
public record UpdateProfileResponse(ProfileDto Profile);

[WolverineHttpPut("/api/v1/profiles/{id:int}")]
public static async Task<IResult> Handle(UpdateProfileRequest request, int id, AppDbContext db)
{
    var profile = await db.Profiles.FindAsync(id);
    if (profile is null) throw new NotFoundException(nameof(Profile), id);

    profile.Name = request.Name;
    profile.DefaultCurrency = request.DefaultCurrency;
    profile.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    var dto = new ProfileDto(profile.Id, profile.Name, profile.DefaultCurrency, profile.CreatedAt, profile.UpdatedAt);
    return Results.Ok(new UpdateProfileResponse(dto));
}
```

**`Features/Profiles/DeleteProfile.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Profiles;

[WolverineHttpDelete("/api/v1/profiles/{id:int}")]
public static async Task<IResult> Handle(int id, AppDbContext db)
{
    var profile = await db.Profiles.FindAsync(id);
    if (profile is null) throw new NotFoundException(nameof(Profile), id);

    db.Profiles.Remove(profile);
    await db.SaveChangesAsync();
    return Results.NoContent();
}
```

### 2.2 Portfolios Feature

Create `Features/Portfolios/` folder with these files:

**`Features/Portfolios/GetPortfolios.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Portfolios;

public record GetPortfoliosResponse(IEnumerable<PortfolioDto> Portfolios);

[WolverineHttpGet("/api/v1/profiles/{profileId:int}/portfolios")]
public static async Task<IResult> Handle(GetPortfoliosRequest request, AppDbContext db)
{
    var portfolios = await db.Portfolios
        .Where(p => p.ProfileId == request.ProfileId)
        .Select(p => new PortfolioDto(p.Id, p.ProfileId, p.Name, p.CreatedAt, p.UpdatedAt))
        .ToListAsync();
    return Results.Ok(new GetPortfoliosResponse(portfolios));
}

public record GetPortfoliosRequest(int ProfileId);
```

**`Features/Portfolios/GetPortfolioById.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Portfolios;

public record GetPortfolioByIdResponse(PortfolioDto Portfolio);

[WolverineHttpGet("/api/v1/portfolios/{id:int}")]
public static async Task<IResult> Handle(GetPortfolioByIdRequest request, AppDbContext db)
{
    var portfolio = await db.Portfolios.FindAsync(request.Id);
    if (portfolio is null) throw new NotFoundException(nameof(Portfolio), request.Id);

    var dto = new PortfolioDto(portfolio.Id, portfolio.ProfileId, portfolio.Name, portfolio.CreatedAt, portfolio.UpdatedAt);
    return Results.Ok(new GetPortfolioByIdResponse(dto));
}

public record GetPortfolioByIdRequest(int Id);
```

**`Features/Portfolios/CreatePortfolio.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Portfolios;

public record CreatePortfolioRequest(int ProfileId, string Name);
public record CreatePortfolioResponse(PortfolioDto Portfolio);

[WolverineHttpPost("/api/v1/portfolios")]
public static async Task<IResult> Handle(CreatePortfolioRequest request, AppDbContext db)
{
    var profile = await db.Profiles.FindAsync(request.ProfileId);
    if (profile is null) throw new NotFoundException(nameof(Profile), request.ProfileId);

    var portfolio = new Portfolio
    {
        ProfileId = request.ProfileId,
        Name = request.Name
    };
    db.Portfolios.Add(portfolio);
    await db.SaveChangesAsync();

    var dto = new PortfolioDto(portfolio.Id, portfolio.ProfileId, portfolio.Name, portfolio.CreatedAt, portfolio.UpdatedAt);
    return Results.Created($"/api/v1/portfolios/{portfolio.Id}", new CreatePortfolioResponse(dto));
}
```

**`Features/Portfolios/UpdatePortfolio.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Portfolios;

public record UpdatePortfolioRequest(string Name);
public record UpdatePortfolioResponse(PortfolioDto Portfolio);

[WolverineHttpPut("/api/v1/portfolios/{id:int}")]
public static async Task<IResult> Handle(UpdatePortfolioRequest request, int id, AppDbContext db)
{
    var portfolio = await db.Portfolios.FindAsync(id);
    if (portfolio is null) throw new NotFoundException(nameof(Portfolio), id);

    portfolio.Name = request.Name;
    portfolio.UpdatedAt = DateTime.UtcNow;
    await db.SaveChangesAsync();

    var dto = new PortfolioDto(portfolio.Id, portfolio.ProfileId, portfolio.Name, portfolio.CreatedAt, portfolio.UpdatedAt);
    return Results.Ok(new UpdatePortfolioResponse(dto));
}
```

**`Features/Portfolios/DeletePortfolio.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Portfolios;

[WolverineHttpDelete("/api/v1/portfolios/{id:int}")]
public static async Task<IResult> Handle(int id, AppDbContext db)
{
    var portfolio = await db.Portfolios.FindAsync(id);
    if (portfolio is null) throw new NotFoundException(nameof(Portfolio), id);

    db.Portfolios.Remove(portfolio);
    await db.SaveChangesAsync();
    return Results.NoContent();
}
```

---

## Phase 3: CQRS — Trades

### Goal
Implement full CRUD for Trades with validation (shares > 0, sell ≤ position via FIFO).

### 3.1 Create DTOs (see Phase 1.3 for full DTO list)

### 3.2 Trade Feature Files

**`Features/Trades/GetTrades.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Trades;

public record GetTradesResponse(IEnumerable<TradeDto> Trades);

[WolverineHttpGet("/api/v1/portfolios/{portfolioId:int}/trades")]
public static async Task<IResult> Handle(GetTradesRequest request, AppDbContext db)
{
    var trades = await db.Trades
        .Where(t => t.PortfolioId == request.PortfolioId)
        .OrderByDescending(t => t.TradeDate)
        .Select(t => new TradeDto(
            t.Id, t.PortfolioId, t.Ticker, t.TradeType, t.Shares,
            t.Price, t.Commission, t.TradeDate, t.Notes, t.Isin, t.Currency
        )).ToListAsync();
    return Results.Ok(new GetTradesResponse(trades));
}

public record GetTradesRequest(int PortfolioId);
```

**`Features/Trades/GetTradeById.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Trades;

public record GetTradeByIdResponse(TradeDetailDto Trade);

[WolverineHttpGet("/api/v1/trades/{id:int}")]
public static async Task<IResult> Handle(GetTradeByIdRequest request, AppDbContext db)
{
    var trade = await db.Trades
        .Include(t => t.Portfolio)
        .ThenInclude(p => p.Profile)
        .FirstOrDefaultAsync(t => t.Id == request.Id);

    if (trade is null) throw new NotFoundException(nameof(Trade), request.Id);

    var dto = new TradeDetailDto(
        trade.Id, trade.PortfolioId, trade.Ticker, trade.TradeType, trade.Shares,
        trade.Price, trade.Commission, trade.TradeDate, trade.Notes, trade.Isin, trade.Currency,
        trade.Portfolio.Name, trade.Portfolio.Profile.Name
    );
    return Results.Ok(new GetTradeByIdResponse(dto));
}

public record GetTradeByIdRequest(int Id);
```

**`Features/Trades/CreateTrade.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Trades;

public record CreateTradeRequest(
    int PortfolioId, string Ticker, TradeType TradeType,
    decimal Shares, decimal Price, decimal Commission,
    DateTime TradeDate, string? Notes, string? Isin, string Currency = "PLN"
);
public record CreateTradeResponse(TradeDto Trade);

[WolverineHttpPost("/api/v1/trades")]
public static async Task<IResult> Handle(CreateTradeRequest request, AppDbContext db)
{
    // Validate portfolio exists
    var portfolio = await db.Portfolios.FindAsync(request.PortfolioId);
    if (portfolio is null) throw new NotFoundException(nameof(Portfolio), request.PortfolioId);

    // Validate shares and price
    if (request.Shares <= 0) return Results.BadRequest("Shares must be greater than 0.");
    if (request.Price <= 0) return Results.BadRequest("Price must be greater than 0.");
    if (request.TradeDate > DateTime.Today) return Results.BadRequest("Trade date cannot be in the future.");

    // For sell trades: check available position (FIFO)
    if (request.TradeType == TradeType.Sell)
    {
        var available = await CalculateAvailableShares(request.PortfolioId, request.Ticker, db);
        if (request.Shares > available)
            return Results.BadRequest($"Cannot sell {request.Shares} shares. Available: {available}.");
    }

    var trade = new Trade
    {
        PortfolioId = request.PortfolioId,
        Ticker = request.Ticker,
        TradeType = request.TradeType,
        Shares = request.Shares,
        Price = request.Price,
        Commission = request.Commission,
        TradeDate = request.TradeDate,
        Notes = request.Notes,
        Isin = request.Isin,
        Currency = request.Currency
    };

    db.Trades.Add(trade);
    await db.SaveChangesAsync();

    var dto = new TradeDto(trade.Id, trade.PortfolioId, trade.Ticker, trade.TradeType, trade.Shares,
        trade.Price, trade.Commission, trade.TradeDate, trade.Notes, trade.Isin, trade.Currency);
    return Results.Created($"/api/v1/trades/{trade.Id}", new CreateTradeResponse(dto));
}

// Helper: calculate available shares for a ticker in a portfolio (FIFO)
private static async Task<decimal> CalculateAvailableShares(int portfolioId, string ticker, AppDbContext db)
{
    var trades = await db.Trades
        .Where(t => t.PortfolioId == portfolioId && t.Ticker == ticker)
        .OrderBy(t => t.TradeDate)
        .ToListAsync();

    decimal bought = 0m;
    decimal sold = 0m;

    foreach (var t in trades)
    {
        if (t.TradeType == TradeType.Buy) bought += t.Shares;
        else sold += t.Shares;
    }

    return Math.Max(0m, bought - sold);
}
```

**`Features/Trades/UpdateTrade.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Trades;

public record UpdateTradeRequest(
    string Ticker, TradeType TradeType, decimal Shares, decimal Price,
    decimal Commission, DateTime TradeDate, string? Notes, string? Isin, string Currency
);
public record UpdateTradeResponse(TradeDto Trade);

[WolverineHttpPut("/api/v1/trades/{id:int}")]
public static async Task<IResult> Handle(UpdateTradeRequest request, int id, AppDbContext db)
{
    var trade = await db.Trades.FindAsync(id);
    if (trade is null) throw new NotFoundException(nameof(Trade), id);

    // Validate
    if (request.Shares <= 0) return Results.BadRequest("Shares must be greater than 0.");
    if (request.Price <= 0) return Results.BadRequest("Price must be greater than 0.");
    if (request.TradeDate > DateTime.Today) return Results.BadRequest("Trade date cannot be in the future.");

    // For sell trades: check available position (excluding this trade if it was a sell)
    if (request.TradeType == TradeType.Sell)
    {
        var otherTrades = await db.Trades
            .Where(t => t.PortfolioId == trade.PortfolioId && t.Ticker == request.Ticker && t.Id != id)
            .OrderBy(t => t.TradeDate)
            .ToListAsync();

        decimal bought = 0m;
        decimal sold = 0m;
        foreach (var t in otherTrades)
        {
            if (t.TradeType == TradeType.Buy) bought += t.Shares;
            else sold += t.Shares;
        }

        if (request.Shares > bought - sold)
            return Results.BadRequest($"Cannot sell {request.Shares} shares. Available: {bought - sold}.");
    }

    trade.Ticker = request.Ticker;
    trade.TradeType = request.TradeType;
    trade.Shares = request.Shares;
    trade.Price = request.Price;
    trade.Commission = request.Commission;
    trade.TradeDate = request.TradeDate;
    trade.Notes = request.Notes;
    trade.Isin = request.Isin;
    trade.Currency = request.Currency;

    await db.SaveChangesAsync();

    var dto = new TradeDto(trade.Id, trade.PortfolioId, trade.Ticker, trade.TradeType, trade.Shares,
        trade.Price, trade.Commission, trade.TradeDate, trade.Notes, trade.Isin, trade.Currency);
    return Results.Ok(new UpdateTradeResponse(dto));
}
```

**`Features/Trades/DeleteTrade.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Trades;

[WolverineHttpDelete("/api/v1/trades/{id:int}")]
public static async Task<IResult> Handle(int id, AppDbContext db)
{
    var trade = await db.Trades.FindAsync(id);
    if (trade is null) throw new NotFoundException(nameof(Trade), id);

    db.Trades.Remove(trade);
    await db.SaveChangesAsync();
    return Results.NoContent();
}
```

---

## Phase 4: CQRS — ETF Reference

### Goal
CRUD for ETF reference data (ticker, name, type, expense ratio, etc.).

### 4.1 ETF Feature Files

**`Features/ETFs/GetETFs.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.ETFs;

public record GetETFsResponse(IEnumerable<ETFDto> ETFs);

[WolverineHttpGet("/api/v1/etfs")]
public static async Task<IResult> Handle(AppDbContext db)
{
    var etfs = await db.ETFs.Select(e => new ETFDto(
        e.Id, e.Ticker, e.Name, e.Exchange, e.Type,
        e.ExpenseRatio, e.Currency, e.Isin, e.CreatedAt
    )).ToListAsync();
    return Results.Ok(new GetETFsResponse(etfs));
}
```

**`Features/ETFs/GetETFById.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.ETFs;

public record GetETFByIdResponse(ETFDto ETF);

[WolverineHttpGet("/api/v1/etfs/{id:int}")]
public static async Task<IResult> Handle(int id, AppDbContext db)
{
    var etf = await db.ETFs.FindAsync(id);
    if (etf is null) throw new NotFoundException(nameof(ETF), id);

    var dto = new ETFDto(etf.Id, etf.Ticker, etf.Name, etf.Exchange, etf.Type,
        etf.ExpenseRatio, etf.Currency, etf.Isin, etf.CreatedAt);
    return Results.Ok(new GetETFByIdResponse(dto));
}
```

**`Features/ETFs/GetETFByTicker.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.ETFs;

public record GetETFByTickerResponse(ETFDto ETF);

[WolverineHttpGet("/api/v1/etfs/ticker/{ticker}")]
public static async Task<IResult> Handle(string ticker, AppDbContext db)
{
    var etf = await db.ETFs.FirstOrDefaultAsync(e => e.Ticker == ticker);
    if (etf is null) throw new NotFoundException(nameof(ETF), ticker);

    var dto = new ETFDto(etf.Id, etf.Ticker, etf.Name, etf.Exchange, etf.Type,
        etf.ExpenseRatio, etf.Currency, etf.Isin, etf.CreatedAt);
    return Results.Ok(new GetETFByTickerResponse(dto));
}
```

**`Features/ETFs/CreateETF.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.ETFs;

public record CreateETFRequest(
    string Ticker, string Name, string? Exchange,
    ETFType Type, decimal? ExpenseRatio, string? Currency, string? Isin
);
public record CreateETFResponse(ETFDto ETF);

[WolverineHttpPost("/api/v1/etfs")]
public static async Task<IResult> Handle(CreateETFRequest request, AppDbContext db)
{
    var etf = new ETF
    {
        Ticker = request.Ticker,
        Name = request.Name,
        Exchange = request.Exchange,
        Type = request.Type,
        ExpenseRatio = request.ExpenseRatio,
        Currency = request.Currency,
        Isin = request.Isin
    };

    db.ETFs.Add(etf);
    await db.SaveChangesAsync();

    var dto = new ETFDto(etf.Id, etf.Ticker, etf.Name, etf.Exchange, etf.Type,
        etf.ExpenseRatio, etf.Currency, etf.Isin, etf.CreatedAt);
    return Results.Created($"/api/v1/etfs/{etf.Id}", new CreateETFResponse(dto));
}
```

**`Features/ETFs/UpdateETF.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.ETFs;

public record UpdateETFRequest(
    string Name, string? Exchange, ETFType Type,
    decimal? ExpenseRatio, string? Currency, string? Isin
);
public record UpdateETFResponse(ETFDto ETF);

[WolverineHttpPut("/api/v1/etfs/{id:int}")]
public static async Task<IResult> Handle(UpdateETFRequest request, int id, AppDbContext db)
{
    var etf = await db.ETFs.FindAsync(id);
    if (etf is null) throw new NotFoundException(nameof(ETF), id);

    etf.Name = request.Name;
    etf.Exchange = request.Exchange;
    etf.Type = request.Type;
    etf.ExpenseRatio = request.ExpenseRatio;
    etf.Currency = request.Currency;
    etf.Isin = request.Isin;

    await db.SaveChangesAsync();

    var dto = new ETFDto(etf.Id, etf.Ticker, etf.Name, etf.Exchange, etf.Type,
        etf.ExpenseRatio, etf.Currency, etf.Isin, etf.CreatedAt);
    return Results.Ok(new UpdateETFResponse(dto));
}
```

---

## Phase 5: Portfolio Summary & P&L (FIFO)

### Goal
Calculate portfolio P&L using FIFO cost basis, including realized and unrealized gains.

### 5.1 DTOs

**`Dtos/HoldingDto.cs`**
```csharp
namespace BetTracker.ApiService.Dtos;

public record HoldingDto(
    string Ticker,
    decimal Shares,
    decimal AvgCost,
    decimal? CurrentPrice,
    decimal TotalInvested,
    decimal CurrentValue,
    decimal GainLoss,
    decimal GainLossPercent,
    decimal RealizedGainLoss,
    string Currency
);
```

**`Dtos/PortfolioSummaryDto.cs`**
```csharp
namespace BetTracker.ApiService.Dtos;

public record PortfolioSummaryDto(
    int PortfolioId,
    string PortfolioName,
    decimal TotalInvested,
    decimal CurrentValue,
    decimal TotalGainLoss,
    decimal TotalGainLossPercent,
    decimal TotalRealizedGainLoss,
    IEnumerable<HoldingDto> Holdings
);
```

### 5.2 GetPortfolioSummary

**`Features/Portfolio/GetPortfolioSummary.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Portfolio;

public record GetPortfolioSummaryResponse(PortfolioSummaryDto Summary);

[WolverineHttpGet("/api/v1/portfolios/{id:int}/summary")]
public static async Task<IResult> Handle(GetPortfolioSummaryRequest request, AppDbContext db)
{
    var portfolio = await db.Portfolios.FindAsync(request.Id);
    if (portfolio is null) throw new NotFoundException(nameof(Portfolio), request.Id);

    // Get all trades ordered by date
    var trades = await db.Trades
        .Where(t => t.PortfolioId == request.Id)
        .OrderBy(t => t.TradeDate)
        .ToListAsync();

    // Group by ticker
    var tickerGroups = trades.GroupBy(t => t.Ticker).ToDictionary(g => g.Key, g => g.ToList());

    var holdings = new List<HoldingDto>();
    decimal totalInvested = 0m;
    decimal currentValue = 0m;
    decimal totalRealizedGainLoss = 0m;

    foreach (var (ticker, tickerTrades) in tickerGroups)
    {
        // FIFO lots
        var lots = new Stack<(decimal Shares, decimal Cost)>();

        foreach (var trade in tickerTrades)
        {
            if (trade.TradeType == TradeType.Buy)
            {
                lots.Push((trade.Shares, trade.Price));
            }
            else // Sell
            {
                decimal remaining = trade.Shares;
                decimal realizedForThisSell = 0m;

                while (remaining > 0m && lots.Any())
                {
                    var (lotShares, lotCost) = lots.Pop();
                    decimal sellFromLot = Math.Min(remaining, lotShares);
                    remaining -= sellFromLot;

                    realizedForThisSell += (trade.Price - lotCost) * sellFromLot;
                    lots.Push((lotShares - sellFromLot, lotCost));
                }

                totalRealizedGainLoss += realizedForThisSell;
            }
        }

        // Calculate current holding
        decimal holdingShares = 0m;
        decimal weightedCost = 0m;

        foreach (var (shares, cost) in lots)
        {
            holdingShares += shares;
            weightedCost += shares * cost;
        }

        decimal avgCost = holdingShares > 0 ? weightedCost / holdingShares : 0m;
        decimal invested = weightedCost;

        // Get current price
        var currentPrice = await db.Prices
            .Where(p => p.Ticker == ticker)
            .OrderByDescending(p => p.FetchedAt)
            .FirstOrDefaultAsync();

        decimal? priceValue = currentPrice?.Price;
        decimal currentVal = holdingShares * (priceValue ?? 0m);

        decimal gainLoss = currentVal - invested;
        decimal gainLossPercent = invested > 0 ? (gainLoss / invested) * 100 : 0m;

        holdings.Add(new HoldingDto(
            ticker, holdingShares, avgCost, priceValue,
            invested, currentVal, gainLoss, gainLossPercent,
            0m, // per-holding realized (simplified)
            trades.First(t => t.Ticker == ticker).Currency
        ));

        totalInvested += invested;
        currentValue += currentVal;
    }

    decimal totalGainLoss = currentValue - totalInvested;
    decimal totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0m;

    var summary = new PortfolioSummaryDto(
        portfolio.Id, portfolio.Name,
        totalInvested, currentValue,
        totalGainLoss, totalGainLossPercent,
        totalRealizedGainLoss, holdings
    );

    return Results.Ok(new GetPortfolioSummaryResponse(summary));
}

public record GetPortfolioSummaryRequest(int Id);
```

---

## Phase 6: Price Fetching

### Goal
Background worker fetches prices from Yahoo Finance, caches them, provides endpoints for manual refresh.

### 6.1 Interfaces & Services

**`Features/Prices/IPriceProvider.cs`**
```csharp
namespace BetTracker.ApiService.Features.Prices;

public interface IPriceProvider
{
    Task<PriceDto?> FetchAsync(string ticker, string currency = "USD");
}
```

**`Features/Prices/YahooFinanceProvider.cs`**
```csharp
using System.Net.Http.Json;

namespace BetTracker.ApiService.Features.Prices;

public class YahooFinanceProvider : IPriceProvider
{
    private readonly HttpClient _http;

    public YahooFinanceProvider(HttpClient http)
    {
        _http = http;
    }

    public async Task<PriceDto?> FetchAsync(string ticker, string currency = "USD")
    {
        // Yahoo Finance API endpoint
        var yfTicker = $"{ticker}.{currency}";
        var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(yfTicker)}?range=1d&interval=1d";

        var result = await _http.GetAsync(url);
        if (!result.IsSuccessStatusCode) return null;

        var json = await result.Content.ReadFromJsonAsync<dynamic>();
        var price = json?.chart?.result?[0]?.meta?.regularMarketPrice;

        if (price == null) return null;

        return new PriceDto(ticker, currency, (decimal)price, DateTime.UtcNow);
    }
}
```

**`Features/Prices/PriceService.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using BetTracker.ApiService.Dtos;

namespace BetTracker.ApiService.Features.Prices;

public class PriceService
{
    private readonly AppDbContext _db;
    private readonly IPriceProvider _provider;
    private readonly IDictionary<string, (PriceDto Price, DateTime Expires)> _cache;
    private readonly TimeSpan _cacheTtl;

    public PriceService(AppDbContext db, IPriceProvider provider, IConfiguration config)
    {
        _db = db;
        _provider = provider;
        _cache = new Dictionary<string, (PriceDto, DateTime)>();
        _cacheTtl = TimeSpan.FromMinutes(config.GetValue<int>("PriceFetcher:IntervalMinutes", 30));
    }

    public async Task<PriceDto> GetOrCreateAsync(string ticker, string currency = "PLN")
    {
        var key = $"{ticker}:{currency}";

        // Check cache
        if (_cache.TryGetValue(key, out var cached) && cached.Expires > DateTime.UtcNow)
            return cached.Price;

        // Fetch from provider
        var price = await _provider.FetchAsync(ticker, currency);
        if (price == null)
            throw new InvalidOperationException($"Failed to fetch price for {ticker}");

        // Save to DB
        var existing = await _db.Prices
            .FirstOrDefaultAsync(p => p.Ticker == ticker && p.Currency == currency);

        if (existing != null)
        {
            existing.Price = price.Price;
            existing.FetchedAt = price.FetchedAt;
        }
        else
        {
            _db.Prices.Add(new Price { Ticker = ticker, Currency = currency, Price = price.Price, FetchedAt = price.FetchedAt });
        }

        await _db.SaveChangesAsync();

        // Update cache
        _cache[key] = (price, DateTime.UtcNow.Add(_cacheTtl));

        return price;
    }

    public async Task<IEnumerable<string>> GetTrackedTickersAsync()
    {
        return await _db.Trades.Select(t => t.Ticker).Distinct().ToListAsync();
    }
}
```

### 6.2 Background Worker

**`Features/Prices/PriceBackgroundWorker.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;

namespace BetTracker.ApiService.Features.Prices;

public class PriceBackgroundWorker : BackgroundService
{
    private readonly IServiceProvider _services;
    private readonly int _intervalMinutes;

    public PriceBackgroundWorker(IServiceProvider services, IConfiguration config)
    {
        _services = services;
        _intervalMinutes = config.GetValue<int>("PriceFetcher:IntervalMinutes", 30);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _services.CreateScope();
                var priceService = scope.ServiceProvider.GetRequiredService<PriceService>();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var tickers = await priceService.GetTrackedTickersAsync();
                foreach (var ticker in tickers.Distinct())
                {
                    try
                    {
                        await priceService.GetOrCreateAsync(ticker);
                    }
                    catch
                    {
                        // Log but continue with other tickers
                    }
                }
            }
            catch
            {
                // Log but continue running
            }

            await Task.Delay(TimeSpan.FromMinutes(_intervalMinutes), stoppingToken);
        }
    }
}
```

### 6.3 Price Endpoints

**`Features/Prices/GetCurrentPrice.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Prices;

public record GetCurrentPriceResponse(PriceDto Price);

[WolverineHttpGet("/api/v1/prices/{ticker}")]
public static async Task<IResult> Handle(GetCurrentPriceRequest request, PriceService priceService)
{
    var price = await priceService.GetOrCreateAsync(request.Ticker);
    return Results.Ok(new GetCurrentPriceResponse(price));
}

public record GetCurrentPriceRequest(string Ticker);
```

**`Features/Prices/GetPricesByTicker.cs`**
```csharp
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Prices;

public record GetPricesByTickerResponse(IEnumerable<PriceDto> Prices);

[WolverineHttpGet("/api/v1/prices/ticker/{ticker}")]
public static async Task<IResult> Handle(GetPricesByTickerRequest request, AppDbContext db)
{
    var prices = await db.Prices
        .Where(p => p.Ticker == request.Ticker)
        .OrderByDescending(p => p.FetchedAt)
        .Select(p => new PriceDto(p.Ticker, p.Currency, p.Price, p.FetchedAt))
        .ToListAsync();
    return Results.Ok(new GetPricesByTickerResponse(prices));
}

public record GetPricesByTickerRequest(string Ticker);
```

**`Features/Prices/RefreshPrice.cs`**
```csharp
using BetTracker.ApiService.Dtos;
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Prices;

public record RefreshPriceResponse(PriceDto Price);

[WolverineHttpPost("/api/v1/prices/refresh/{ticker}")]
public static async Task<IResult> Handle(RefreshPriceRequest request, PriceService priceService)
{
    var price = await priceService.GetOrCreateAsync(request.Ticker);
    return Results.Ok(new RefreshPriceResponse(price));
}

public record RefreshPriceRequest(string Ticker);
```

**`Features/Prices/RefreshAllPrices.cs`**
```csharp
using Wolverine.Attributes;

namespace BetTracker.ApiService.Features.Prices;

[WolverineHttpPost("/api/v1/prices/refresh-all")]
public static async Task<IResult> Handle(PriceService priceService)
{
    var tickers = await priceService.GetTrackedTickersAsync();
    var results = new List<string>();

    foreach (var ticker in tickers.Distinct())
    {
        try
        {
            await priceService.GetOrCreateAsync(ticker);
            results.Add($"Refreshed {ticker}");
        }
        catch (Exception ex)
        {
            results.Add($"Failed {ticker}: {ex.Message}");
        }
    }

    return Results.Ok(results);
}
```

### 6.4 Register Services

Update `Common/Dependencies.cs`:
```csharp
services.AddScoped<IPriceProvider, YahooFinanceProvider>();
services.AddScoped<PriceService>();
services.AddHostedService<PriceBackgroundWorker>();
services.AddHttpClient<IPriceProvider, YahooFinanceProvider>();
```

---

## Phase 7: Error Handling & Middleware

### Goal
Consistent error responses via ProblemDetails.

### 7.1 Exceptions

**`Common/Exceptions/NotFoundException.cs`**
```csharp
namespace BetTracker.ApiService.Common.Exceptions;

public class NotFoundException : Exception
{
    public NotFoundException(string entity, object id)
        : base($"{entity} with id '{id}' not found.") { }
}
```

**`Common/Exceptions/BusinessRuleException.cs`**
```csharp
namespace BetTracker.ApiService.Common.Exceptions;

public class BusinessRuleException : Exception
{
    public BusinessRuleException(string message) : base(message) { }
}
```

### 7.2 Exception Middleware

**`Common/Middleware/ExceptionMiddleware.cs`**
```csharp
using BetTracker.ApiService.Common.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace BetTracker.ApiService.Common.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionMiddleware> _logger;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (NotFoundException ex)
        {
            context.Response.StatusCode = 404;
            await context.Response.WriteAsJsonAsync(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.5.4",
                title = "Not Found",
                status = 404,
                detail = ex.Message
            });
        }
        catch (BusinessRuleException ex)
        {
            context.Response.StatusCode = 400;
            await context.Response.WriteAsJsonAsync(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                title = "Bad Request",
                status = 400,
                detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            context.Response.StatusCode = 500;
            await context.Response.WriteAsJsonAsync(new
            {
                type = "https://tools.ietf.org/html/rfc9110#section-15.5.1",
                title = "Internal Server Error",
                status = 500,
                detail = "An unexpected error occurred."
            });
        }
    }
}
```

### 7.3 Register Middleware

In `Program.cs`, add before `MapWolverineEndpoints()`:
```csharp
app.UseMiddleware<ExceptionMiddleware>();
```

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profiles` | List all profiles |
| GET | `/api/v1/profiles/{id}` | Get profile by ID |
| POST | `/api/v1/profiles` | Create profile |
| PUT | `/api/v1/profiles/{id}` | Update profile |
| DELETE | `/api/v1/profiles/{id}` | Delete profile |
| GET | `/api/v1/profiles/{profileId}/portfolios` | List portfolios for profile |
| GET | `/api/v1/portfolios/{id}` | Get portfolio by ID |
| POST | `/api/v1/portfolios` | Create portfolio |
| PUT | `/api/v1/portfolios/{id}` | Update portfolio |
| DELETE | `/api/v1/portfolios/{id}` | Delete portfolio |
| GET | `/api/v1/portfolios/{portfolioId}/trades` | List trades for portfolio |
| GET | `/api/v1/trades/{id}` | Get trade by ID (with details) |
| POST | `/api/v1/trades` | Create trade |
| PUT | `/api/v1/trades/{id}` | Update trade |
| DELETE | `/api/v1/trades/{id}` | Delete trade |
| GET | `/api/v1/etfs` | List all ETFs |
| GET | `/api/v1/etfs/{id}` | Get ETF by ID |
| GET | `/api/v1/etfs/ticker/{ticker}` | Get ETF by ticker |
| POST | `/api/v1/etfs` | Create ETF |
| PUT | `/api/v1/etfs/{id}` | Update ETF |
| GET | `/api/v1/portfolios/{id}/summary` | Portfolio P&L summary (FIFO) |
| GET | `/api/v1/prices/{ticker}` | Get current price |
| GET | `/api/v1/prices/ticker/{ticker}` | Get price history |
| POST | `/api/v1/prices/refresh/{ticker}` | Refresh single price |
| POST | `/api/v1/prices/refresh-all` | Refresh all tracked prices |

---

## Execution Order

1. **Phase 0** — Solution scaffolding + base config
2. **Phase 1** — Entities + DbContext + migrations
3. **Phase 2** — Profiles & Portfolios CQRS
4. **Phase 3** — Trades CQRS
5. **Phase 4** — ETF CQRS
6. **Phase 5** — Portfolio Summary + FIFO P&L
7. **Phase 6** — Price fetching (worker + endpoints)
8. **Phase 7** — Error handling + middleware polish

---

## Notes for AI Agent

- All handler files follow the same pattern: request record → Wolverine attribute → static async Handle method
- DTOs are `record` types with positional parameters
- Use `var` when type is obvious
- Use `DateTime.UtcNow` for timestamps
- All errors return `ProblemDetails`-compatible JSON
- The `CalculateAvailableShares` helper in CreateTrade is a simplified FIFO check — Phase 5 has the full FIFO implementation
- Yahoo Finance endpoint may need tweaking — it's a working starting point
- The price worker uses `IntervalMinutes` from config — set to a large value (e.g. 60) during development
