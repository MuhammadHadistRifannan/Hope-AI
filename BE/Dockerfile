# Konfigurasi rahasia diberikan lewat environment variable saat container dijalankan:
#   APIKEY, Supabase__Url, Supabase__PublishableKey, Cors__AllowedOrigins__0
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY backend.csproj .
RUN dotnet restore backend.csproj
COPY . .
RUN dotnet publish backend.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .
# Banyak hosting memberi port lewat variabel PORT; bawaan 8080
CMD ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} exec dotnet backend.dll"]
