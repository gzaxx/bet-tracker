using Microsoft.EntityFrameworkCore;
using JasperFx.CodeGeneration;
using Wolverine;
using Wolverine.Http;
using BetTracker.ApiService.Common.Time;
using BetTracker.ApiService.Contracts;
using BetTracker.ApiService.Contracts.Validation;
using BetTracker.ApiService.Data;

SQLitePCL.raw.SetProvider(new SQLitePCL.SQLite3Provider_e_sqlite3());
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddSingleton<IClock, SystemClock>();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("BetTracker")));
builder.Services.AddScoped<IRequestValidator<CreateProfileRequest>, CreateProfileRequestValidator>();
builder.Services.AddScoped<IRequestValidator<UpdateProfileRequest>, UpdateProfileRequestValidator>();
builder.Services.AddScoped<IRequestValidator<CreatePortfolioRequest>, CreatePortfolioRequestValidator>();
builder.Services.AddScoped<IRequestValidator<UpdatePortfolioRequest>, UpdatePortfolioRequestValidator>();
builder.Services.AddScoped<IRequestValidator<CreateTradeRequest>, CreateTradeRequestValidator>();
builder.Services.AddScoped<IRequestValidator<UpdateTradeRequest>, UpdateTradeRequestValidator>();
builder.Services.AddScoped<IRequestValidator<CreatePriceObservationRequest>, CreatePriceObservationRequestValidator>();
builder.Services.AddScoped<IRequestValidator<UpdatePriceObservationRequest>, UpdatePriceObservationRequestValidator>();
builder.Services.AddScoped<IRequestValidator<CreateETFRequest>, CreateETFRequestValidator>();
builder.Services.AddScoped<IRequestValidator<UpdateETFRequest>, UpdateETFRequestValidator>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("Frontend", policy =>
    {
        policy.WithOrigins(builder.Configuration.GetSection("Frontend:Origins").Get<string[]>() ?? ["http://localhost:5173"])
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

builder.Services.AddWolverineHttp();
builder.Services.AddWolverine(opts =>
    opts.CodeGeneration.TypeLoadMode = builder.Environment.IsEnvironment("Testing")
        ? TypeLoadMode.Static
        : TypeLoadMode.Dynamic);
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

app.UseExceptionHandler();
app.UseCors("Frontend");

app.MapHealthChecks("/health");
app.MapHealthChecks("/api/v1/health");
app.MapGet("/", () => Results.Ok(new { name = "Bet Tracker API", status = "ok" }));

app.MapWolverineEndpoints(_ => { });

app.Run();

public partial class Program;
