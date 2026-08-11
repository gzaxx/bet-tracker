var builder = DistributedApplication.CreateBuilder(args);

var api = builder
    .AddProject<Projects.BetTracker_ApiService>("api")
    .WithExternalHttpEndpoints();

builder
    .AddViteApp("frontend", "../../../apps/bet-tracker-client")
    .WithReference(api)
    .WithEnvironment("VITE_API_PROXY_TARGET", api.GetEndpoint("http"))
    .WaitFor(api)
    .WithExternalHttpEndpoints();

builder.Build().Run();
