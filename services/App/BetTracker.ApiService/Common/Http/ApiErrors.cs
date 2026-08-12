using BetTracker.ApiService.Contracts.Validation;
using Microsoft.AspNetCore.Mvc;

namespace BetTracker.ApiService.Common.Http;

public static class ApiErrors
{
    public static IResult Validation(IReadOnlyList<ValidationError> errors)
    {
        var errorDictionary = errors
            .GroupBy(error => error.Field, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                group => group.Key,
                group => group.Select(error => error.Message).ToArray(),
                StringComparer.OrdinalIgnoreCase);

        return Results.ValidationProblem(errorDictionary, statusCode: StatusCodes.Status400BadRequest);
    }

    public static IResult NotFound(string resource, int id) =>
        Results.Problem(
            title: $"{resource} not found.",
            detail: $"No {resource.ToLowerInvariant()} exists with ID {id}.",
            statusCode: StatusCodes.Status404NotFound);

    public static IResult Conflict(string detail) =>
        Results.Problem(
            title: "The request conflicts with existing data.",
            detail: detail,
            statusCode: StatusCodes.Status409Conflict);

    public static IResult BadRequest(string detail) =>
        Results.Problem(
            title: "The request is invalid.",
            detail: detail,
            statusCode: StatusCodes.Status400BadRequest);
}
