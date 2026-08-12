using System.Net;
using System.Net.Http.Json;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Data.Entities;

namespace BetTracker.Api.Tests;

public sealed class Phase3ApiTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient client;

    public Phase3ApiTests(ApiWebApplicationFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Trades_are_sorted_normalized_and_support_full_crud()
    {
        var portfolio = await CreatePortfolio();
        var executedAt = new DateTimeOffset(2026, 1, 2, 12, 0, 0, TimeSpan.Zero);
        var buy = await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, " msft ", TradeType.Buy, 10, 100, 5, executedAt, " usd ", "buy", null));
        var sell = await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSFT", TradeType.Sell, 4, 120, 2, executedAt.AddHours(1), "USD", null, null));

        using var listResponse = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}/trades");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var trades = await listResponse.Content.ReadFromJsonAsync<TradeDto[]>();
        Assert.NotNull(trades);
        Assert.Equal([buy.Id, sell.Id], trades.Select(trade => trade.Id).ToArray());
        Assert.Equal("MSFT", trades[0].Ticker);
        Assert.Equal("USD", trades[0].Currency);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/portfolios/{portfolio.Id}/trades/{sell.Id}",
            new UpdateTradeRequest(" msft ", TradeType.Sell, 3, 125, 1, executedAt.AddHours(1), "USD", "updated", null));
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<TradeDto>();
        Assert.NotNull(updated);
        Assert.Equal(3m, updated.Shares);

        using var deleteResponse = await client.DeleteAsync($"/api/v1/portfolios/{portfolio.Id}/trades/{sell.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
    }

    [Fact]
    public async Task Oversell_is_rejected_without_persisting_the_trade()
    {
        var portfolio = await CreatePortfolio();
        await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSFT", TradeType.Buy, 2, 100, 0, DateTimeOffset.UtcNow.AddMinutes(-2), "USD", null, null));

        using var response = await client.PostAsJsonAsync(
            $"/api/v1/portfolios/{portfolio.Id}/trades",
            new CreateTradeRequest(portfolio.Id, "MSFT", TradeType.Sell, 2.01m, 120, 0, DateTimeOffset.UtcNow.AddMinutes(-1), "USD", null, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var listResponse = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}/trades");
        var trades = await listResponse.Content.ReadFromJsonAsync<TradeDto[]>();
        Assert.NotNull(trades);
        Assert.Single(trades);
    }

    [Fact]
    public async Task Editing_a_historical_trade_rejects_an_invalid_resulting_position()
    {
        var portfolio = await CreatePortfolio();
        var first = await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSFT", TradeType.Buy, 10, 100, 0, DateTimeOffset.UtcNow.AddMinutes(-3), "USD", null, null));
        var second = await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSFT", TradeType.Sell, 5, 120, 0, DateTimeOffset.UtcNow.AddMinutes(-2), "USD", null, null));

        using var response = await client.PutAsJsonAsync(
            $"/api/v1/portfolios/{portfolio.Id}/trades/{first.Id}",
            new UpdateTradeRequest("MSFT", TradeType.Buy, 3, 100, 0, DateTimeOffset.UtcNow.AddMinutes(-3), "USD", null, null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var getResponse = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}/trades/{first.Id}");
        var persisted = await getResponse.Content.ReadFromJsonAsync<TradeDto>();
        Assert.NotNull(persisted);
        Assert.Equal(10m, persisted.Shares);
        Assert.Equal(second.PortfolioId, persisted.PortfolioId);
    }

    [Fact]
    public async Task Deleting_a_trade_recalculates_history_and_rejects_invalid_positions()
    {
        var portfolio = await CreatePortfolio();
        var buy = await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSFT", TradeType.Buy, 5, 100, 0, DateTimeOffset.UtcNow.AddMinutes(-3), "USD", null, null));
        var sell = await CreateTrade(portfolio.Id, new CreateTradeRequest(portfolio.Id, "MSFT", TradeType.Sell, 5, 120, 0, DateTimeOffset.UtcNow.AddMinutes(-2), "USD", null, null));

        using var response = await client.DeleteAsync($"/api/v1/portfolios/{portfolio.Id}/trades/{buy.Id}");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var listResponse = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}/trades");
        var trades = await listResponse.Content.ReadFromJsonAsync<TradeDto[]>();
        Assert.NotNull(trades);
        Assert.Equal([buy.Id, sell.Id], trades.Select(trade => trade.Id).ToArray());
    }

    [Fact]
    public async Task Trade_currency_and_portfolio_scope_are_enforced()
    {
        var usdPortfolio = await CreatePortfolio("USD");
        var eurPortfolio = await CreatePortfolio("EUR");
        using var currencyResponse = await client.PostAsJsonAsync(
            $"/api/v1/portfolios/{usdPortfolio.Id}/trades",
            new CreateTradeRequest(usdPortfolio.Id, "MSFT", TradeType.Buy, 1, 100, 0, DateTimeOffset.UtcNow.AddMinutes(-1), "EUR", null, null));
        Assert.Equal(HttpStatusCode.BadRequest, currencyResponse.StatusCode);

        var eurTrade = await CreateTrade(eurPortfolio.Id, new CreateTradeRequest(eurPortfolio.Id, "AAPL", TradeType.Buy, 2, 200, 0, DateTimeOffset.UtcNow.AddMinutes(-1), "EUR", null, null));
        using var usdListResponse = await client.GetAsync($"/api/v1/portfolios/{usdPortfolio.Id}/trades");
        using var eurListResponse = await client.GetAsync($"/api/v1/portfolios/{eurPortfolio.Id}/trades");
        Assert.Empty(await usdListResponse.Content.ReadFromJsonAsync<TradeDto[]>() ?? []);
        var eurTrades = await eurListResponse.Content.ReadFromJsonAsync<TradeDto[]>();
        Assert.Equal([eurTrade.Id], eurTrades!.Select(trade => trade.Id).ToArray());
    }

    private async Task<PortfolioDto> CreatePortfolio(string currency = "USD")
    {
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest($"Phase 3 {Guid.NewGuid():N}", currency));
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, $"Portfolio {Guid.NewGuid():N}"));
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);
        return portfolio;
    }

    private async Task<TradeDto> CreateTrade(int portfolioId, CreateTradeRequest request)
    {
        using var response = await client.PostAsJsonAsync($"/api/v1/portfolios/{portfolioId}/trades", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var trade = await response.Content.ReadFromJsonAsync<TradeDto>();
        Assert.NotNull(trade);
        return trade;
    }
}
