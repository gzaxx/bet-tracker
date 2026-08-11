namespace BetTracker.ApiService.Data.Entities;

public sealed class Profile
{
    public int Id { get; init; }
    public string Name { get; set; } = string.Empty;
    public string DefaultCurrency { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; internal set; }
    public DateTimeOffset UpdatedAt { get; internal set; }

    public ICollection<Portfolio> Portfolios { get; } = new List<Portfolio>();
}
