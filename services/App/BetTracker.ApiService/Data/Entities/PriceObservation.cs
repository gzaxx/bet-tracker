namespace BetTracker.ApiService.Data.Entities;

public sealed class PriceObservation
{
    public int Id { get; init; }
    public string Ticker { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public DateTimeOffset EffectiveAt { get; set; }
    public DateTimeOffset CreatedAt { get; internal set; }
    public string Source { get; set; } = string.Empty;
    public string? ProviderSymbol { get; set; }
}
