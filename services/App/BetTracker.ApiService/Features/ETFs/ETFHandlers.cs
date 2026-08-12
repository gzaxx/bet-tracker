using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.ETFs;

public sealed class ListETFHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/etfs")]
    public async Task<IResult> Handle(CancellationToken cancellationToken)
    {
        var etfs = (await db.ETFs.AsNoTracking()
            .OrderBy(etf => etf.Ticker)
            .ThenBy(etf => etf.Id)
            .ToListAsync(cancellationToken))
            .Select(ETFDtoMapper.Map)
            .ToArray();

        return Results.Ok(etfs);
    }
}

public sealed class GetETFHandler(AppDbContext db)
{
    [WolverineGet("/api/v1/etfs/{id:int}")]
    public async Task<IResult> Handle(int id, CancellationToken cancellationToken)
    {
        var etf = await db.ETFs.AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        return etf is null ? ApiErrors.NotFound("ETF", id) : Results.Ok(ETFDtoMapper.Map(etf));
    }
}

public sealed class CreateETFHandler(
    AppDbContext db,
    IRequestValidator<CreateETFRequest> validator)
{
    [WolverinePost("/api/v1/etfs")]
    public async Task<IResult> Handle(CreateETFRequest request, CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var etf = new ETF
        {
            Ticker = RequestNormalization.NormalizeTicker(request.Ticker),
            Name = request.Name?.Trim(),
            Exchange = request.Exchange?.Trim(),
            Isin = request.Isin?.Trim().ToUpperInvariant(),
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? null : RequestNormalization.NormalizeCurrency(request.Currency),
            ExpenseRatio = request.ExpenseRatio
        };
        db.ETFs.Add(etf);
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ApiErrors.Conflict("An ETF with this ticker already exists.");
        }

        return Results.Created($"/api/v1/etfs/{etf.Id}", ETFDtoMapper.Map(etf));
    }
}

public sealed class UpdateETFHandler(
    AppDbContext db,
    IRequestValidator<UpdateETFRequest> validator)
{
    [WolverinePut("/api/v1/etfs/{id:int}")]
    public async Task<IResult> Handle(int id, UpdateETFRequest request, CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0)
        {
            return ApiErrors.Validation(errors);
        }

        var etf = await db.ETFs.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (etf is null)
        {
            return ApiErrors.NotFound("ETF", id);
        }

        etf.Ticker = RequestNormalization.NormalizeTicker(request.Ticker);
        etf.Name = request.Name?.Trim();
        etf.Exchange = request.Exchange?.Trim();
        etf.Isin = request.Isin?.Trim().ToUpperInvariant();
        etf.Currency = string.IsNullOrWhiteSpace(request.Currency) ? null : RequestNormalization.NormalizeCurrency(request.Currency);
        etf.ExpenseRatio = request.ExpenseRatio;
        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ApiErrors.Conflict("An ETF with this ticker already exists.");
        }

        return Results.Ok(ETFDtoMapper.Map(etf));
    }
}

public sealed class DeleteETFHandler(AppDbContext db)
{
    [WolverineDelete("/api/v1/etfs/{id:int}")]
    public async Task<IResult> Handle(int id, CancellationToken cancellationToken)
    {
        var etf = await db.ETFs.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (etf is null)
        {
            return ApiErrors.NotFound("ETF", id);
        }

        db.ETFs.Remove(etf);
        await db.SaveChangesAsync(cancellationToken);
        return Results.NoContent();
    }
}

internal static class ETFDtoMapper
{
    public static ETFDto Map(ETF etf) => new(
        etf.Id,
        etf.Ticker,
        etf.Name,
        etf.Exchange,
        etf.Isin,
        etf.Currency,
        etf.ExpenseRatio,
        etf.CreatedAt);
}
