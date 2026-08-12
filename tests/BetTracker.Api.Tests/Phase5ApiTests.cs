using System.Net;
using System.Net.Http.Json;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data.Entities;

namespace BetTracker.Api.Tests;

public sealed class Phase5ApiTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient client;

    public Phase5ApiTests(ApiWebApplicationFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Summary_uses_fifo_costs_commissions_and_manual_current_prices()
    {
        var portfolio = await CreatePortfolio();
        var first = new DateTimeOffset(2026, 1, 2, 12, 0, 0, TimeSpan.Zero);
        await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSF5", TradeType.Buy, 10, 100, 5, first, "USD", null, null));
        await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSF5", TradeType.Buy, 5, 120, 0, first.AddHours(1), "USD", null, null));
        await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSF5", TradeType.Sell, 12, 150, 2, first.AddHours(2), "USD", null, null));
        await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "AAP5", TradeType.Buy, 2, 50, 1, first.AddHours(3), "USD", null, null));
        await CreatePrice(new CreatePriceObservationRequest("MSF5", "USD", 160, first.AddHours(4), "Manual", null));

        using var response = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}/summary");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var summary = await response.Content.ReadFromJsonAsync<PortfolioSummaryDto>();
        Assert.NotNull(summary);
        Assert.Equal("USD", summary.Currency);
        Assert.Equal(461m, summary.TotalCostBasis);
        Assert.Equal(480m, summary.TotalMarketValue);
        Assert.Equal(553m, summary.RealizedProfitLoss);
        Assert.Equal(["AAP5"], summary.MissingPriceTickers);

        var msft = Assert.Single(summary.Holdings, holding => holding.Ticker == "MSF5");
        Assert.Equal(3m, msft.Shares);
        Assert.Equal(120m, msft.AverageCost);
        Assert.Equal(360m, msft.CostBasis);
        Assert.Equal(160m, msft.CurrentPrice);
        Assert.Equal(480m, msft.CurrentValue);
        Assert.Equal(120m, msft.UnrealizedProfitLoss);

        var aapl = Assert.Single(summary.Holdings, holding => holding.Ticker == "AAP5");
        Assert.Null(aapl.CurrentPrice);
        Assert.Null(aapl.CurrentValue);
        Assert.Null(aapl.UnrealizedProfitLoss);
    }

    [Fact]
    public async Task Summary_scopes_to_the_requested_portfolio()
    {
        var portfolio = await CreatePortfolio();
        var otherPortfolio = await CreatePortfolio();
        var executedAt = DateTimeOffset.UtcNow.AddMinutes(-5);
        await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSF6", TradeType.Buy, 1, 100, 0, executedAt, "USD", null, null));
        await CreateTrade(otherPortfolio.Id, new CreateTradeRequest(otherPortfolio.Id, "MSF6", TradeType.Buy, 2, 100, 0, executedAt, "USD", null, null));
        await CreatePrice(new CreatePriceObservationRequest("MSF6", "USD", 110, DateTimeOffset.UtcNow.AddMinutes(-2), "Manual", null));

        using var response = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}/summary");
        var summary = await response.Content.ReadFromJsonAsync<PortfolioSummaryDto>();
        Assert.NotNull(summary);
        Assert.Equal(portfolio.Id, summary.PortfolioId);
        Assert.Equal(110m, summary.Holdings.Single().CurrentPrice);
        Assert.Equal(1m, summary.Holdings.Single().Shares);

        using var missingResponse = await client.GetAsync("/api/v1/portfolios/999999/summary");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    private async Task<PortfolioDto> CreatePortfolio()
    {
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest($"Phase 5 {Guid.NewGuid():N}", "USD"));
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, $"Portfolio {Guid.NewGuid():N}"));
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);
        return portfolio;
    }

    private async Task CreateTrade(int portfolioId, CreateTradeRequest request)
    {
        using var response = await client.PostAsJsonAsync($"/api/v1/portfolios/{portfolioId}/trades", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    private async Task CreatePrice(CreatePriceObservationRequest request)
    {
        using var response = await client.PostAsJsonAsync("/api/v1/prices", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }
}
