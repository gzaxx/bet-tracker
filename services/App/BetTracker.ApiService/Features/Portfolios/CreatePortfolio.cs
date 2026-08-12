using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using BetTracker.ApiService.Data.Entities;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Portfolios;

public sealed class CreatePortfolioHandler(AppDbContext db, IRequestValidator<CreatePortfolioRequest> validator)
{
    [WolverinePost("/api/v1/portfolios")]
    public async Task<IResult> Handle(CreatePortfolioRequest request, CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0) return ApiErrors.Validation(errors);

        var profile = await db.Profiles.AsNoTracking().SingleOrDefaultAsync(candidate => candidate.Id == request.ProfileId, cancellationToken);
        if (profile is null) return ApiErrors.NotFound("Profile", request.ProfileId);

        var portfolio = new Portfolio
        {
            ProfileId = profile.Id,
            Name = RequestNormalization.NormalizeName(request.Name),
            Currency = profile.DefaultCurrency
        };
        db.Portfolios.Add(portfolio);
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException) { return ApiErrors.Conflict("A portfolio with this name already exists for the profile."); }

        var dto = new PortfolioDto(portfolio.Id, portfolio.ProfileId, portfolio.Name, portfolio.Currency, portfolio.CreatedAt, portfolio.UpdatedAt);
        return Results.Created($"/api/v1/portfolios/{dto.Id}", dto);
    }
}
