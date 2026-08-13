using System.Net;
using System.Net.Http.Json;
using BetTracker.ApiService.Contracts;

namespace BetTracker.Api.Tests;

public sealed class Phase2ApiTests : IClassFixture<ApiWebApplicationFactory>
{
    private readonly HttpClient client;

    public Phase2ApiTests(ApiWebApplicationFactory factory)
    {
        client = factory.CreateClient();
    }

    [Fact]
    public async Task Profile_and_portfolio_creation_returns_bare_dtos_and_copies_currency()
    {
        var profileName = $"Personal {Guid.NewGuid():N}";
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest(profileName, " usd "));

        Assert.Equal(HttpStatusCode.Created, profileResponse.StatusCode);
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);
        Assert.Equal("USD", profile.DefaultCurrency);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, "Long term"));

        Assert.Equal(HttpStatusCode.Created, portfolioResponse.StatusCode);
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);
        Assert.Equal(profile.Id, portfolio.ProfileId);
        Assert.Equal("USD", portfolio.Currency);
    }

    [Fact]
    public async Task Profile_creation_defaults_currency_to_pln_when_omitted()
    {
        var profileName = $"PLN default {Guid.NewGuid():N}";
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new { name = profileName });

        Assert.Equal(HttpStatusCode.Created, profileResponse.StatusCode);
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);
        Assert.Equal("PLN", profile.DefaultCurrency);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, "PLN portfolio"));

        Assert.Equal(HttpStatusCode.Created, portfolioResponse.StatusCode);
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);
        Assert.Equal("PLN", portfolio.Currency);
    }

    [Fact]
    public async Task Validation_not_found_and_duplicate_requests_return_problem_details()
    {
        using var invalidResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest("", "US"));
        Assert.Equal(HttpStatusCode.BadRequest, invalidResponse.StatusCode);
        Assert.Contains("application/problem+json", invalidResponse.Content.Headers.ContentType?.MediaType);

        using var missingResponse = await client.GetAsync("/api/v1/profiles/999999999");
        Assert.Equal(HttpStatusCode.NotFound, missingResponse.StatusCode);

        var profileName = $"Duplicate {Guid.NewGuid():N}";
        using var firstResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest(profileName, "EUR"));
        Assert.Equal(HttpStatusCode.Created, firstResponse.StatusCode);

        using var duplicateResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest(profileName, "EUR"));
        Assert.Equal(HttpStatusCode.Conflict, duplicateResponse.StatusCode);
    }

    [Fact]
    public async Task Portfolio_currency_change_is_rejected()
    {
        var profileName = $"Immutable {Guid.NewGuid():N}";
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest(profileName, "USD"));
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, "Main"));
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/v1/portfolios/{portfolio.Id}",
            new { name = "Main renamed", currency = "EUR" });

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        var unchanged = await client.GetFromJsonAsync<PortfolioDto>($"/api/v1/portfolios/{portfolio.Id}");
        Assert.NotNull(unchanged);
        Assert.Equal("USD", unchanged.Currency);
        Assert.Equal("Main", unchanged.Name);
    }

    [Fact]
    public async Task Deleting_a_profile_explicitly_cascades_its_portfolios()
    {
        var profileName = $"Cascade {Guid.NewGuid():N}";
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest(profileName, "GBP"));
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, "Main"));
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);

        using var deleteResponse = await client.DeleteAsync($"/api/v1/profiles/{profile.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        using var deletedProfileResponse = await client.GetAsync($"/api/v1/profiles/{profile.Id}");
        using var deletedPortfolioResponse = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}");
        Assert.Equal(HttpStatusCode.NotFound, deletedProfileResponse.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, deletedPortfolioResponse.StatusCode);
    }
    [Fact]
    public async Task Profiles_and_portfolios_support_get_update_and_delete()
    {
        var profileName = $"Crud {Guid.NewGuid():N}";
        using var profileResponse = await client.PostAsJsonAsync(
            "/api/v1/profiles",
            new CreateProfileRequest(profileName, "USD"));
        var profile = await profileResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(profile);

        using var profileUpdateResponse = await client.PutAsJsonAsync(
            $"/api/v1/profiles/{profile.Id}",
            new UpdateProfileRequest($"{profileName} Updated", "CAD"));
        Assert.Equal(HttpStatusCode.OK, profileUpdateResponse.StatusCode);
        var updatedProfile = await profileUpdateResponse.Content.ReadFromJsonAsync<ProfileDto>();
        Assert.NotNull(updatedProfile);
        Assert.Equal("CAD", updatedProfile.DefaultCurrency);

        using var portfolioResponse = await client.PostAsJsonAsync(
            "/api/v1/portfolios",
            new CreatePortfolioRequest(profile.Id, "Main"));
        var portfolio = await portfolioResponse.Content.ReadFromJsonAsync<PortfolioDto>();
        Assert.NotNull(portfolio);
        Assert.Equal("CAD", portfolio.Currency);

        using var portfolioUpdateResponse = await client.PutAsJsonAsync(
            $"/api/v1/portfolios/{portfolio.Id}",
            new UpdatePortfolioRequest("Main Updated"));
        Assert.Equal(HttpStatusCode.OK, portfolioUpdateResponse.StatusCode);

        var portfolios = await client.GetFromJsonAsync<PortfolioDto[]>("/api/v1/portfolios");
        Assert.Contains(portfolios ?? [], candidate => candidate.Id == portfolio.Id && candidate.Name == "Main Updated");

        using var deleteResponse = await client.DeleteAsync($"/api/v1/portfolios/{portfolio.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);
        using var missingPortfolioResponse = await client.GetAsync($"/api/v1/portfolios/{portfolio.Id}");
        Assert.Equal(HttpStatusCode.NotFound, missingPortfolioResponse.StatusCode);

        using var profileDeleteResponse = await client.DeleteAsync($"/api/v1/profiles/{profile.Id}");
        Assert.Equal(HttpStatusCode.NoContent, profileDeleteResponse.StatusCode);
    }

}
