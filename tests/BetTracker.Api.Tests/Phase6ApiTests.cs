using System.Net;
using System.Net.Http.Json;
using BetTracker.ApiService.Contracts;

namespace BetTracker.Api.Tests;

public sealed class Phase6ApiTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient client;

    public Phase6ApiTests(ApiWebApplicationFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task ETF_reference_supports_list_get_update_and_delete()
    {
        var ticker = $"E{Random.Shared.Next(100000, 999999)}";
        var request = new CreateETFRequest(ticker.ToLowerInvariant(), " Core ETF ", " NASDAQ ", "us1234567890", "usd", 0.35m);
        using var createResponse = await client.PostAsJsonAsync("/api/v1/etfs", request);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<ETFDto>();
        Assert.NotNull(created);
        Assert.Equal(ticker, created.Ticker);
        Assert.Equal("Core ETF", created.Name);
        Assert.Equal("NASDAQ", created.Exchange);
        Assert.Equal("US1234567890", created.Isin);
        Assert.Equal("USD", created.Currency);

        using var getResponse = await client.GetAsync($"/api/v1/etfs/{created.Id}");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);
        Assert.Equal(created.Id, (await getResponse.Content.ReadFromJsonAsync<ETFDto>())!.Id);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/etfs/{created.Id}",
            new UpdateETFRequest(ticker, " Updated ETF ", " NYSE ", "US0987654321", "USD", 0.2m));
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);
        var updated = await updateResponse.Content.ReadFromJsonAsync<ETFDto>();
        Assert.NotNull(updated);
        Assert.Equal("Updated ETF", updated.Name);
        Assert.Equal("NYSE", updated.Exchange);
        Assert.Equal(0.2m, updated.ExpenseRatio);

        using var listResponse = await client.GetAsync("/api/v1/etfs");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var listed = await listResponse.Content.ReadFromJsonAsync<ETFDto[]>();
        Assert.Contains(listed!, etf => etf.Id == created.Id);

        using var deleteResponse = await client.DeleteAsync($"/api/v1/etfs/{created.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        using var missingResponse = await client.GetAsync($"/api/v1/etfs/{created.Id}");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);
    }

    [Fact]
    public async Task ETF_reference_returns_validation_duplicate_and_not_found_errors()
    {
        var ticker = $"D{Random.Shared.Next(100000, 999999)}";
        using var validationResponse = await client.PostAsJsonAsync(
            "/api/v1/etfs",
            new CreateETFRequest("invalid ticker!", null, null, null, "USD", 101));
        Assert.Equal(HttpStatusCode.BadRequest, validationResponse.StatusCode);

        var created = await CreateETF(ticker);
        using var duplicateResponse = await client.PostAsJsonAsync(
            "/api/v1/etfs",
            new CreateETFRequest(ticker.ToLowerInvariant(), null, null, null, null, null));
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);

        using var missingUpdateResponse = await client.PutAsJsonAsync(
            "/api/v1/etfs/999999",
            new UpdateETFRequest("MISSING", null, null, null, null, null));
        Assert.Equal(HttpStatusCode.NotFound, missingUpdateResponse.StatusCode);
        using var missingDeleteResponse = await client.DeleteAsync("/api/v1/etfs/999999");
        Assert.Equal(HttpStatusCode.NotFound, missingDeleteResponse.StatusCode);
        await client.DeleteAsync($"/api/v1/etfs/{created.Id}");
    }

    private async Task<ETFDto> CreateETF(string ticker)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/v1/etfs",
            new CreateETFRequest(ticker, "Reference ETF", null, null, "USD", null));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var etf = await response.Content.ReadFromJsonAsync<ETFDto>();
        Assert.NotNull(etf);
        return etf;
    }
}
