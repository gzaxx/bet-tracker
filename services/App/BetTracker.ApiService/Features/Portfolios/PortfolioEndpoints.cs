using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Portfolios;

public static class PortfolioEndpoints
{
    [WolverineGet("/api/v1/portfolios")]
    public static async Task<IResult> List(AppDbContext db, CancellationToken cancellationToken)
    {
        var portfolios = await db.Portfolios
            .AsNoTracking()
            .OrderBy(portfolio => portfolio.ProfileId)
            .ThenBy(portfolio => portfolio.Name)
            .ThenBy(portfolio => portfolio.Id)
            .Select(portfolio => new PortfolioDto(
                portfolio.Id,
                portfolio.ProfileId,
                portfolio.Name,
                portfolio.Currency,
                portfolio.CreatedAt,
                portfolio.UpdatedAt))
            .ToArrayAsync(cancellationToken);

        return Results.Ok(portfolios);
    }

    [WolverineGet("/api/v1/portfolios/{id}")]
    public static async Task<IResult> Get(int id, AppDbContext db, CancellationToken cancellationToken)
    {
        var portfolio = await db.Portfolios
            .AsNoTracking()
            .Where(candidate => candidate.Id == id)
            .Select(candidate => new PortfolioDto(
                candidate.Id,
                candidate.ProfileId,
                candidate.Name,
                candidate.Currency,
                candidate.CreatedAt,
                candidate.UpdatedAt))
            .SingleOrDefaultAsync(cancellationToken);

        return portfolio is null ? ApiErrors.NotFound("Portfolio", id) : Results.Ok(portfolio);
    }

    [WolverinePost("/api/v1/portfolios")]
    public static async Task<IResult> Create(
        CreatePortfolioRequest request,
        AppDbContext db,
        IRequestValidator<CreatePortfolioRequest> validator,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var profile = await db.Profiles
            .AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == request.ProfileId, cancellationToken);
        if (profile is null)
        {
            return ApiErrors.NotFound("Profile", request.ProfileId);
        }

        var portfolio = new Portfolio
        {
            ProfileId = profile.Id,
            Name = RequestNormalization.NormalizeName(request.Name),
            Currency = profile.DefaultCurrency
        };
        db.Portfolios.Add(portfolio);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ApiErrors.Conflict("A portfolio with this name already exists for the profile.");
        }

        var dto = ToDto(portfolio);
        return Results.Created($"/api/v1/portfolios/{dto.Id}", dto);
    }

    [WolverinePut("/api/v1/portfolios/{id}")]
    public static async Task<IResult> Update(
        int id,
        UpdatePortfolioRequest request,
        AppDbContext db,
        IRequestValidator<UpdatePortfolioRequest> validator,
        CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var portfolio = await db.Portfolios.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (portfolio is null)
        {
            return ApiErrors.NotFound("Portfolio", id);
        }

        if (request.Currency is not null &&
            !string.Equals(
                RequestNormalization.NormalizeCurrency(request.Currency),
                portfolio.Currency,
                StringComparison.Ordinal))
        {
            return ApiErrors.BadRequest("Portfolio currency is immutable after creation.");
        }

        portfolio.Name = RequestNormalization.NormalizeName(request.Name);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ApiErrors.Conflict("A portfolio with this name already exists for the profile.");
        }

        return Results.Ok(ToDto(portfolio));
    }

    [WolverineDelete("/api/v1/portfolios/{id}")]
    public static async Task<IResult> Delete(int id, AppDbContext db, CancellationToken cancellationToken)
    {
        var portfolio = await db.Portfolios.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (portfolio is null)
        {
            return ApiErrors.NotFound("Portfolio", id);
        }

        db.Portfolios.Remove(portfolio);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }

    private static PortfolioDto ToDto(Portfolio portfolio) => new(
        portfolio.Id,
        portfolio.ProfileId,
        portfolio.Name,
        portfolio.Currency,
        portfolio.CreatedAt,
        portfolio.UpdatedAt);
}
