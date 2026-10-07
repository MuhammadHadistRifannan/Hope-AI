using GeminiDotnet;
using HopeAi;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IGeminiService , GeminiService>();
builder.Services.AddSingleton<IOcrService , OcrService>();

builder.Services.AddScoped<IChatHistoryService , ChatHistoryService>();
builder.Services.AddSingleton<ITtsService , TtsService>();
builder.Services.AddHttpClient();

// Token login Supabase diverifikasi lewat kunci publik (JWKS) milik project
string supabaseAuthUrl = builder.Configuration["Supabase:Url"]!.TrimEnd('/') + "/auth/v1";
builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = supabaseAuthUrl;
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = supabaseAuthUrl,
            ValidAudience = "authenticated",
            NameClaimType = "sub"
        };
    });
builder.Services.AddAuthorization();

builder.Services.AddControllers();

// Dokumentasi API: /openapi/v1.json, dengan tampilan interaktif di /docs
builder.Services.AddOpenApi(options =>
{
    options.AddDocumentTransformer((document, context, cancellationToken) =>
    {
        document.Info = new OpenApiInfo
        {
            Title = "HopeAI API",
            Version = "v1",
            Description = "API backend HopeAI: tutor AI, kuis, ringkasan, versi bahasa sederhana, suara, dan pembacaan dokumen. "
                + "Semua endpoint kecuali /health membutuhkan token login Supabase di header Authorization: Bearer <token>. "
                + "Batas pemakaian 30 permintaan per menit per pengguna."
        };
        document.Components ??= new OpenApiComponents();
        document.Components.SecuritySchemes ??= new Dictionary<string, IOpenApiSecurityScheme>();
        document.Components.SecuritySchemes["Bearer"] = new OpenApiSecurityScheme
        {
            Type = SecuritySchemeType.Http,
            Scheme = "bearer",
            BearerFormat = "JWT",
            Description = "Token akses Supabase milik pengguna yang sedang login"
        };
        // Tanda gembok di semua endpoint; /health tetap bisa dipanggil tanpa token
        document.Security =
        [
            new OpenApiSecurityRequirement { [new OpenApiSecuritySchemeReference("Bearer", document)] = [] }
        ];
        return Task.CompletedTask;
    });
});

// Hanya asal yang terdaftar di konfigurasi yang boleh memanggil API dari browser
string[] allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? new[] { "http://localhost:5173" };

builder.Services.AddCors(options =>
{
    options.AddPolicy("cors" , policy =>
    {
        policy.WithOrigins(allowedOrigins);
        policy.AllowAnyHeader(); 
        policy.AllowAnyMethod();
        policy.WithExposedHeaders("X-Tts-Cache");
    });
});

// Batas pemakaian per pengguna supaya kuota AI tidak bisa dihabiskan satu akun
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
    {
        string key = context.User.FindFirst("sub")?.Value
            ?? context.Connection.RemoteIpAddress?.ToString()
            ?? "anonim";

        return RateLimitPartition.GetFixedWindowLimiter(key, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 30,
            Window = TimeSpan.FromMinutes(1)
        });
    });
});


var app = builder.Build();

app.UseCors("cors");

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.MapControllers();

app.MapOpenApi().AllowAnonymous().DisableRateLimiting();
app.MapGet("/docs" , () => Results.Content(ApiDocs.Page , "text/html; charset=utf-8"))
    .AllowAnonymous()
    .DisableRateLimiting()
    .ExcludeFromDescription();

// Dipanggil hosting dan cron keep-alive; tidak butuh login dan tidak memanggil AI
app.MapGet("/health" , () => Results.Ok(new { status = "ok" }))
    .WithSummary("Memeriksa apakah server hidup")
    .AllowAnonymous()
    .DisableRateLimiting();

app.Run();