using JasperFx.CodeGeneration;
using Wolverine;
using Wolverine.Http;

using BetTracker.ApiService.Data;
using Microsoft.EntityFrameworkCore;

SQLitePCL.raw.SetProvider(new SQLitePCL.SQLite3Provider_e_sqlite3());
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddProblemDetails();
builder.Services.AddHealthChecks();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("BetTracker")));
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

app.UseExceptionHandler();
app.UseCors("Frontend");

app.MapHealthChecks("/health");
app.MapHealthChecks("/api/v1/health");
app.MapGet("/", () => Results.Ok(new { name = "Bet Tracker API", status = "ok" }));

app.MapWolverineEndpoints(_ => { });

app.Run();

public partial class Program;
