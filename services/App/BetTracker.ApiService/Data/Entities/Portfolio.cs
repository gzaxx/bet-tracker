namespace BetTracker.ApiService.Data.Entities;

public sealed class Portfolio
{
    public int Id { get; init; }
    public int ProfileId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Currency { get; init; } = string.Empty;
    public DateTimeOffset CreatedAt { get; internal set; }
    public DateTimeOffset UpdatedAt { get; internal set; }

    public Profile Profile { get; set; } = null!;
    public ICollection<Trade> Trades { get; } = new List<Trade>();
}
