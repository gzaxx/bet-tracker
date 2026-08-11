using BetTracker.ApiService.Common.Time;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace BetTracker.ApiService.Data;

public sealed class AppDbContext(
    DbContextOptions<AppDbContext> options,
    IClock? clock = null) : DbContext(options)
{
    private readonly IClock clock = clock ?? new SystemClock();
    private static readonly ValueConverter<DateTimeOffset, long> UtcTimestampConverter =
        new(
            value => value.UtcDateTime.Ticks,
            value => new DateTimeOffset(value, TimeSpan.Zero));

    public DbSet<Profile> Profiles => Set<Profile>();
    public DbSet<Portfolio> Portfolios => Set<Portfolio>();
    public DbSet<Trade> Trades => Set<Trade>();
    public DbSet<PriceObservation> PriceObservations => Set<PriceObservation>();
    public DbSet<ETF> ETFs => Set<ETF>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Profile>(entity =>
        {
            entity.ToTable("Profiles");
            entity.HasKey(profile => profile.Id);
            entity.Property(profile => profile.Name).HasMaxLength(100).IsRequired();
            entity.Property(profile => profile.DefaultCurrency).HasMaxLength(3).IsRequired();
            entity.Property(profile => profile.CreatedAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.Property(profile => profile.UpdatedAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.HasIndex(profile => profile.Name).IsUnique();
        });

        modelBuilder.Entity<Portfolio>(entity =>
        {
            entity.ToTable("Portfolios");
            entity.HasKey(portfolio => portfolio.Id);
            entity.Property(portfolio => portfolio.Name).HasMaxLength(100).IsRequired();
            entity.Property(portfolio => portfolio.Currency).HasMaxLength(3).IsRequired();
            entity.Property(portfolio => portfolio.CreatedAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.Property(portfolio => portfolio.UpdatedAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.HasOne(portfolio => portfolio.Profile)
                .WithMany(profile => profile.Portfolios)
                .HasForeignKey(portfolio => portfolio.ProfileId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(portfolio => new { portfolio.ProfileId, portfolio.Name }).IsUnique();
        });

        modelBuilder.Entity<Trade>(entity =>
        {
            entity.ToTable("Trades");
            entity.HasKey(trade => trade.Id);
            entity.Property(trade => trade.Ticker).HasMaxLength(20).IsRequired();
            entity.Property(trade => trade.TradeType).HasConversion<string>().HasMaxLength(4).IsRequired();
            entity.Property(trade => trade.Shares).HasPrecision(18, 8).IsRequired();
            entity.Property(trade => trade.Price).HasPrecision(18, 4).IsRequired();
            entity.Property(trade => trade.Commission).HasPrecision(18, 4).IsRequired();
            entity.Property(trade => trade.ExecutedAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.Property(trade => trade.Notes).HasMaxLength(2000);
            entity.Property(trade => trade.Isin).HasMaxLength(12);
            entity.Property(trade => trade.Currency).HasMaxLength(3).IsRequired();
            entity.HasOne(trade => trade.Portfolio)
                .WithMany(portfolio => portfolio.Trades)
                .HasForeignKey(trade => trade.PortfolioId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(trade => new { trade.PortfolioId, trade.Ticker, trade.ExecutedAt });
        });

        modelBuilder.Entity<PriceObservation>(entity =>
        {
            entity.ToTable("PriceObservations");
            entity.HasKey(observation => observation.Id);
            entity.Property(observation => observation.Ticker).HasMaxLength(20).IsRequired();
            entity.Property(observation => observation.Currency).HasMaxLength(3).IsRequired();
            entity.Property(observation => observation.Price).HasPrecision(18, 4).IsRequired();
            entity.Property(observation => observation.EffectiveAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.Property(observation => observation.CreatedAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.Property(observation => observation.Source).HasMaxLength(32).IsRequired();
            entity.Property(observation => observation.ProviderSymbol).HasMaxLength(64);
            entity.HasIndex(observation => new
            {
                observation.Ticker,
                observation.Currency,
                observation.EffectiveAt
            });
        });

        modelBuilder.Entity<ETF>(entity =>
        {
            entity.ToTable("ETFs");
            entity.HasKey(etf => etf.Id);
            entity.Property(etf => etf.Ticker).HasMaxLength(20).IsRequired();
            entity.Property(etf => etf.Name).HasMaxLength(200);
            entity.Property(etf => etf.Exchange).HasMaxLength(50);
            entity.Property(etf => etf.Isin).HasMaxLength(12);
            entity.Property(etf => etf.Currency).HasMaxLength(3);
            entity.Property(etf => etf.ExpenseRatio).HasPrecision(10, 6);
            entity.Property(etf => etf.CreatedAt).HasConversion(UtcTimestampConverter).IsRequired();
            entity.HasIndex(etf => etf.Ticker).IsUnique();
        });
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        PrepareChanges();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override int SaveChanges() => SaveChanges(true);

    public override Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        PrepareChanges();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        SaveChangesAsync(true, cancellationToken);

    private void PrepareChanges()
    {
        var now = clock.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added)
            {
                SetCreatedTimestamp(entry.Entity, now);
            }

            if (entry.State == EntityState.Modified)
            {
                EnsurePortfolioCurrencyIsImmutable(entry);
                SetUpdatedTimestamp(entry.Entity, now);
            }
        }
    }

    private static void SetCreatedTimestamp(object entity, DateTimeOffset now)
    {
        switch (entity)
        {
            case Profile profile when profile.CreatedAt == default:
                profile.CreatedAt = now;
                profile.UpdatedAt = now;
                break;
            case Portfolio portfolio when portfolio.CreatedAt == default:
                portfolio.CreatedAt = now;
                portfolio.UpdatedAt = now;
                break;
            case PriceObservation observation when observation.CreatedAt == default:
                observation.CreatedAt = now;
                break;
            case ETF etf when etf.CreatedAt == default:
                etf.CreatedAt = now;
                break;
        }
    }

    private static void SetUpdatedTimestamp(object entity, DateTimeOffset now)
    {
        switch (entity)
        {
            case Profile profile:
                profile.UpdatedAt = now;
                break;
            case Portfolio portfolio:
                portfolio.UpdatedAt = now;
                break;
        }
    }

    private static void EnsurePortfolioCurrencyIsImmutable(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
    {
        if (entry.Entity is Portfolio &&
            entry.Property(nameof(Portfolio.Currency)).IsModified &&
            !string.Equals(
                entry.Property(nameof(Portfolio.Currency)).OriginalValue as string,
                entry.Property(nameof(Portfolio.Currency)).CurrentValue as string,
                StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Portfolio currency is immutable after creation.");
        }
    }
}
