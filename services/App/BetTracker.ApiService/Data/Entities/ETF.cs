namespace BetTracker.ApiService.Data.Entities;

public sealed class ETF
{
    public int Id { get; init; }
    public string Ticker { get; set; } = string.Empty;
    public string? Name { get; set; }
    public string? Exchange { get; set; }
    public string? Isin { get; set; }
    public string? Currency { get; set; }
    public decimal? ExpenseRatio { get; set; }
    public DateTimeOffset CreatedAt { get; internal set; }
}
