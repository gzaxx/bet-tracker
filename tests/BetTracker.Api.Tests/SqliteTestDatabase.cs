using BetTracker.ApiService.Common.Time;
using SQLitePCL;
using BetTracker.ApiService.Data;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace BetTracker.Api.Tests;

public sealed class SqliteTestDatabase : IAsyncDisposable
{
    private readonly SqliteConnection connection;
    private readonly DbContextOptions<AppDbContext> options;

    static SqliteTestDatabase()
    {
        raw.SetProvider(new SQLite3Provider_e_sqlite3());
    }
    public SqliteTestDatabase(DateTimeOffset? now = null)
    {
        connection = new SqliteConnection("Data Source=:memory:");
        connection.Open();
        options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite(connection)
            .Options;
        Clock = new FixedClock(now ?? new DateTimeOffset(2026, 1, 2, 12, 0, 0, TimeSpan.Zero));
    }

    public IClock Clock { get; }

    public async Task<AppDbContext> CreateContextAsync()
    {
        var context = new AppDbContext(options, Clock);
        await context.Database.MigrateAsync();
        return context;
    }

    public ValueTask DisposeAsync()
    {
        connection.Dispose();
        return ValueTask.CompletedTask;
    }
}
