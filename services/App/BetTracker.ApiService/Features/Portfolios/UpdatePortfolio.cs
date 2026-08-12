using BetTracker.ApiService.Common.Http;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;
using Wolverine.Http;

namespace BetTracker.ApiService.Features.Portfolios;

public sealed class UpdatePortfolioHandler(AppDbContext db, IRequestValidator<UpdatePortfolioRequest> validator)
{
    [WolverinePut("/api/v1/portfolios/{id}")]
    public async Task<IResult> Handle(int id, UpdatePortfolioRequest request, CancellationToken cancellationToken)
    {
        var errors = validator.Validate(request);
        if (errors.Count > 0) return ApiErrors.Validation(errors);

        var portfolio = await db.Portfolios.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (portfolio is null) return ApiErrors.NotFound("Portfolio", id);
        if (request.Currency is not null && !string.Equals(RequestNormalization.NormalizeCurrency(request.Currency), portfolio.Currency, StringComparison.Ordinal))
            return ApiErrors.BadRequest("Portfolio currency is immutable after creation.");

        portfolio.Name = RequestNormalization.NormalizeName(request.Name);
        try { await db.SaveChangesAsync(cancellationToken); }
        catch (DbUpdateException) { return ApiErrors.Conflict("A portfolio with this name already exists for the profile."); }

        return Results.Ok(new PortfolioDto(portfolio.Id, portfolio.ProfileId, portfolio.Name, portfolio.Currency, portfolio.CreatedAt, portfolio.UpdatedAt));
    }
}
