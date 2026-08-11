namespace BetTracker.ApiService.Data.Entities;

public enum TradeType
{
    Buy,
    Sell
}

public sealed class Trade
{
    public int Id { get; init; }
    public int PortfolioId { get; set; }
    public string Ticker { get; set; } = string.Empty;
    public TradeType TradeType { get; set; }
    public decimal Shares { get; set; }
    public decimal Price { get; set; }
    public decimal Commission { get; set; }
    public DateTimeOffset ExecutedAt { get; set; }
    public string? Notes { get; set; }
    public string? Isin { get; set; }
    public string Currency { get; set; } = string.Empty;

    public Portfolio Portfolio { get; set; } = null!;
}
