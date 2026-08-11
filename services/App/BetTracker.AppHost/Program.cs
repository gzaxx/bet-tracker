var builder = DistributedApplication.CreateBuilder(args);

builder.AddProject<Projects.BetTracker_ApiService>("api");

builder.Build().Run();
