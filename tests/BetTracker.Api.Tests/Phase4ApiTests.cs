using System.Net;
using System.Net.Http.Json;
using BetTracker.ApiService.Contracts;

namespace BetTracker.Api.Tests;

public sealed class Phase4ApiTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient client;

    public Phase4ApiTests(ApiWebApplicationFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Price_history_retains_observations_and_selects_newest_non_future_current_price()
    {
        await CreatePortfolio("USD");
        var now = DateTimeOffset.UtcNow;
        var older = await CreatePrice(new CreatePriceObservationRequest(" msft ", "usd", 100, now.AddDays(-2), "External", null));
        var newest = await CreatePrice(new CreatePriceObservationRequest("MSFT", "USD", 110, now.AddHours(-1), "Manual", null));

        using var futureResponse = await client.PostAsJsonAsync(
            "/api/v1/prices",
            new CreatePriceObservationRequest("MSFT", "USD", 120, now.AddHours(1), "Manual", null));
        Assert.Equal(HttpStatusCode.BadRequest, futureResponse.StatusCode);

        using var currentResponse = await client.GetAsync("/api/v1/prices/msft?currency=usd");
        Assert.Equal(HttpStatusCode.OK, currentResponse.StatusCode);
        var current = await currentResponse.Content.ReadFromJsonAsync<PriceObservationDto>();
        Assert.NotNull(current);
        Assert.Equal(newest.Id, current.Id);
        Assert.Equal("Manual", current.Source);

        using var historyResponse = await client.GetAsync("/api/v1/prices/MSFT/history?currency=USD");
        var history = await historyResponse.Content.ReadFromJsonAsync<PriceObservationDto[]>();
        Assert.NotNull(history);
        Assert.Equal([newest.Id, older.Id], history.Select(observation => observation.Id).ToArray());
    }

    [Fact]
    public async Task Price_observations_support_update_delete_and_explicit_missing_current()
    {
        await CreatePortfolio("USD");
        var observation = await CreatePrice(new CreatePriceObservationRequest(
            "AAPL",
            "USD",
            200,
            DateTimeOffset.UtcNow.AddHours(-1),
            "Manual",
            null));

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/prices/{observation.Id}",
            new UpdatePriceObservationRequest(" AAPL ", "USD", 205, DateTimeOffset.UtcNow.AddMinutes(-10), "External", "NASDAQ:AAPL"));
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<PriceObservationDto>();
        Assert.NotNull(updated);
        Assert.Equal(205m, updated.Price);
        Assert.Equal("Manual", updated.Source);
        Assert.Equal("NASDAQ:AAPL", updated.ProviderSymbol);

        using var deleteResponse = await client.DeleteAsync($"/api/v1/prices/{observation.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        using var currentResponse = await client.GetAsync("/api/v1/prices/AAPL?currency=USD");
        Assert.Equal(HttpStatusCode.OK, currentResponse.StatusCode);
        Assert.Null(await currentResponse.Content.ReadFromJsonAsync<PriceObservationDto>());
    }

    [Fact]
    public async Task Price_currency_must_match_existing_portfolio_currency()
    {
        await CreatePortfolio("USD");

        using var response = await client.PostAsJsonAsync(
            "/api/v1/prices",
            new CreatePriceObservationRequest("MSFT", "EUR", 100, DateTimeOffset.UtcNow.AddMinutes(-1), "Manual", null));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<PortfolioDto> CreatePortfolio(string currency)
    {
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest($"Phase 4 {Guid.NewGuid():N}", currency));
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, $"Portfolio {Guid.NewGuid():N}"));
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);
        return portfolio;
    }

    private async Task<PriceObservationDto> CreatePrice(CreatePriceObservationRequest request)
    {
        using var response = await client.PostAsJsonAsync("/api/v1/prices", request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var observation = await response.Content.ReadFromJsonAsync<PriceObservationDto>();
        Assert.NotNull(observation);
        return observation;
    }
}
