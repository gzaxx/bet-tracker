using System.Text.RegularExpressions;
using BetTracker.ApiService.Common.Time;
using BetTracker.ApiService.Data.Entities;

namespace BetTracker.ApiService.Contracts.Validation;

public sealed record ValidationError(string Field, string Message);

public static class RequestNormalization
{
    public static string NormalizeCurrency(string? currency) => currency?.Trim().ToUpperInvariant() ?? string.Empty;

    public static string NormalizeTicker(string? ticker) => ticker?.Trim().ToUpperInvariant() ?? string.Empty;

    public static string NormalizeName(string? name) => name?.Trim() ?? string.Empty;
}

public interface IRequestValidator<in TRequest>
{
    IReadOnlyList<ValidationError> Validate(TRequest request);
}

public abstract class RequestValidatorBase(IClock clock)
{
    protected IClock Clock { get; } = clock;

    protected static void Required(ICollection<ValidationError> errors, string field, string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors.Add(new ValidationError(field, $"{field} is required."));
        }
    }

    protected static void MaxLength(ICollection<ValidationError> errors, string field, string? value, int length)
    {
        if (value is not null && value.Trim().Length > length)
        {
            errors.Add(new ValidationError(field, $"{field} must be at most {length} characters."));
        }
    }

    protected static void Currency(ICollection<ValidationError> errors, string field, string? value, bool optional = false)
    {
        var normalized = RequestNormalization.NormalizeCurrency(value);
        if (optional && string.IsNullOrEmpty(normalized))
        {
            return;
        }

        if (!Regex.IsMatch(normalized, "^[A-Z]{3}$"))
        {
            errors.Add(new ValidationError(field, $"{field} must be a three-letter ISO currency code."));
        }
    }

    protected static void Ticker(ICollection<ValidationError> errors, string field, string? value)
    {
        var normalized = RequestNormalization.NormalizeTicker(value);
        if (!Regex.IsMatch(normalized, "^[A-Z0-9][A-Z0-9.-]{0,19}$"))
        {
            errors.Add(new ValidationError(field, $"{field} must contain 1 to 20 ticker characters."));
        }
    }

    protected static void Name(ICollection<ValidationError> errors, string field, string? value)
    {
        Required(errors, field, value);
        MaxLength(errors, field, value, 100);
    }

    protected static void FutureTimestamp(
        ICollection<ValidationError> errors,
        string field,
        DateTimeOffset value,
        DateTimeOffset now)
    {
        if (value.ToUniversalTime() > now)
        {
            errors.Add(new ValidationError(field, $"{field} cannot be in the future."));
        }
    }
}

public sealed class CreateProfileRequestValidator(IClock clock) : RequestValidatorBase(clock), IRequestValidator<CreateProfileRequest>
{
    public IReadOnlyList<ValidationError> Validate(CreateProfileRequest request)
    {
        var errors = new List<ValidationError>();
        Name(errors, nameof(request.Name), request.Name);
        Currency(errors, nameof(request.DefaultCurrency), request.DefaultCurrency);
        return errors;
    }
}

public sealed class UpdateProfileRequestValidator(IClock clock) : RequestValidatorBase(clock), IRequestValidator<UpdateProfileRequest>
{
    public IReadOnlyList<ValidationError> Validate(UpdateProfileRequest request)
    {
        var errors = new List<ValidationError>();
        Name(errors, nameof(request.Name), request.Name);
        Currency(errors, nameof(request.DefaultCurrency), request.DefaultCurrency);
        return errors;
    }
}

public sealed class CreatePortfolioRequestValidator(IClock clock) : RequestValidatorBase(clock), IRequestValidator<CreatePortfolioRequest>
{
    public IReadOnlyList<ValidationError> Validate(CreatePortfolioRequest request)
    {
        var errors = new List<ValidationError>();
        if (request.ProfileId <= 0)
        {
            errors.Add(new ValidationError(nameof(request.ProfileId), "ProfileId must be greater than zero."));
        }

        Name(errors, nameof(request.Name), request.Name);
        return errors;
    }
}

public sealed class UpdatePortfolioRequestValidator(IClock clock) : RequestValidatorBase(clock), IRequestValidator<UpdatePortfolioRequest>
{
    public IReadOnlyList<ValidationError> Validate(UpdatePortfolioRequest request)
    {
        var errors = new List<ValidationError>();
        Name(errors, nameof(request.Name), request.Name);
        if (request.Currency is not null)
        {
            Currency(errors, nameof(request.Currency), request.Currency);
        }

        return errors;
    }
}

public abstract class TradeRequestValidatorBase(IClock clock) : RequestValidatorBase(clock)
{
    protected IReadOnlyList<ValidationError> ValidateTrade(
        string ticker,
        decimal shares,
        decimal price,
        decimal commission,
        DateTimeOffset executedAt,
        string currency)
    {
        var errors = new List<ValidationError>();
        Ticker(errors, nameof(ticker), ticker);
        Currency(errors, nameof(currency), currency);
        if (shares <= 0)
        {
            errors.Add(new ValidationError(nameof(shares), "Shares must be greater than zero."));
        }

        if (price <= 0)
        {
            errors.Add(new ValidationError(nameof(price), "Price must be greater than zero."));
        }

        if (commission < 0)
        {
            errors.Add(new ValidationError(nameof(commission), "Commission cannot be negative."));
        }

        FutureTimestamp(errors, nameof(executedAt), executedAt, Clock.UtcNow);
        return errors;
    }
}

public sealed class CreateTradeRequestValidator(IClock clock) : TradeRequestValidatorBase(clock), IRequestValidator<CreateTradeRequest>
{
    public IReadOnlyList<ValidationError> Validate(CreateTradeRequest request) =>
        ValidateTrade(request.Ticker, request.Shares, request.Price, request.Commission, request.ExecutedAt, request.Currency);
}

public sealed class UpdateTradeRequestValidator(IClock clock) : TradeRequestValidatorBase(clock), IRequestValidator<UpdateTradeRequest>
{
    public IReadOnlyList<ValidationError> Validate(UpdateTradeRequest request) =>
        ValidateTrade(request.Ticker, request.Shares, request.Price, request.Commission, request.ExecutedAt, request.Currency);
}

public abstract class PriceObservationRequestValidatorBase(IClock clock) : RequestValidatorBase(clock)
{
    protected IReadOnlyList<ValidationError> ValidateObservation(
        string ticker,
        string currency,
        decimal price,
        DateTimeOffset effectiveAt,
        string source,
        string? providerSymbol)
    {
        var errors = new List<ValidationError>();
        Ticker(errors, nameof(ticker), ticker);
        Currency(errors, nameof(currency), currency);
        Required(errors, nameof(source), source);
        MaxLength(errors, nameof(source), source, 32);
        MaxLength(errors, nameof(providerSymbol), providerSymbol, 64);
        if (price <= 0)
        {
            errors.Add(new ValidationError(nameof(price), "Price must be greater than zero."));
        }

        FutureTimestamp(errors, nameof(effectiveAt), effectiveAt, Clock.UtcNow);
        return errors;
    }
}

public sealed class CreatePriceObservationRequestValidator(IClock clock) : PriceObservationRequestValidatorBase(clock), IRequestValidator<CreatePriceObservationRequest>
{
    public IReadOnlyList<ValidationError> Validate(CreatePriceObservationRequest request) =>
        ValidateObservation(request.Ticker, request.Currency, request.Price, request.EffectiveAt, request.Source, request.ProviderSymbol);
}

public sealed class UpdatePriceObservationRequestValidator(IClock clock) : PriceObservationRequestValidatorBase(clock), IRequestValidator<UpdatePriceObservationRequest>
{
    public IReadOnlyList<ValidationError> Validate(UpdatePriceObservationRequest request) =>
        ValidateObservation(request.Ticker, request.Currency, request.Price, request.EffectiveAt, request.Source, request.ProviderSymbol);
}

public abstract class ETFRequestValidatorBase(IClock clock) : RequestValidatorBase(clock)
{
    protected IReadOnlyList<ValidationError> ValidateETF(
        string ticker,
        string? isin,
        string? currency,
        decimal? expenseRatio)
    {
        var errors = new List<ValidationError>();
        Ticker(errors, nameof(ticker), ticker);
        Currency(errors, nameof(currency), currency, optional: true);
        MaxLength(errors, nameof(isin), isin, 12);
        if (expenseRatio is < 0 or > 100)
        {
            errors.Add(new ValidationError(nameof(expenseRatio), "ExpenseRatio must be between zero and 100."));
        }

        return errors;
    }
}

public sealed class CreateETFRequestValidator(IClock clock) : ETFRequestValidatorBase(clock), IRequestValidator<CreateETFRequest>
{
    public IReadOnlyList<ValidationError> Validate(CreateETFRequest request) =>
        ValidateETF(request.Ticker, request.Isin, request.Currency, request.ExpenseRatio);
}

public sealed class UpdateETFRequestValidator(IClock clock) : ETFRequestValidatorBase(clock), IRequestValidator<UpdateETFRequest>
{
    public IReadOnlyList<ValidationError> Validate(UpdateETFRequest request) =>
        ValidateETF(request.Ticker, request.Isin, request.Currency, request.ExpenseRatio);
}
