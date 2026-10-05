using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace HopeAi;

public record ChatTurn(
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("content")] string Content);

public class ChatSessionNotFoundException : Exception
{
    public ChatSessionNotFoundException() : base("Sesi percakapan tidak ditemukan") { }
}

// Riwayat chat disimpan di Supabase memakai token milik pengguna,
// jadi RLS memastikan tiap pengguna hanya menyentuh percakapannya sendiri.
public class ChatHistoryService : IChatHistoryService
{
    readonly IHttpClientFactory _httpClientFactory;
    readonly string _restUrl;
    readonly string _publishableKey;

    public ChatHistoryService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _restUrl = configuration["Supabase:Url"]!.TrimEnd('/') + "/rest/v1";
        _publishableKey = configuration["Supabase:PublishableKey"]!;
    }

    public async Task<string> EnsureSession(string userToken, string userId, string? sessionId, string firstMessage)
    {
        if (!string.IsNullOrEmpty(sessionId))
        {
            if (!Guid.TryParse(sessionId, out var parsed)) throw new ChatSessionNotFoundException();

            var found = await Send<List<SessionRow>>(HttpMethod.Get,
                $"/chat_sessions?id=eq.{parsed}&select=id", userToken);
            if (found == null || found.Count == 0) throw new ChatSessionNotFoundException();
            return found[0].Id;
        }

        string title = firstMessage.Length > 60 ? firstMessage[..60] + "..." : firstMessage;
        var created = await Send<List<SessionRow>>(HttpMethod.Post,
            "/chat_sessions?select=id", userToken,
            new { user_id = userId, title }, returnRows: true);
        return created![0].Id;
    }

    public async Task<List<ChatTurn>> GetRecentMessages(string userToken, string sessionId, int limit)
    {
        var rows = await Send<List<ChatTurn>>(HttpMethod.Get,
            $"/chat_messages?session_id=eq.{sessionId}&select=role,content&order=created_at.desc&limit={limit}",
            userToken);
        rows ??= new List<ChatTurn>();
        rows.Reverse();
        return rows;
    }

    public async Task SaveExchange(string userToken, string userId, string sessionId, string userText, string assistantText)
    {
        // Waktu diisi di sini agar pertanyaan selalu terurut sebelum jawabannya
        var now = DateTimeOffset.UtcNow;
        await Send<object>(HttpMethod.Post, "/chat_messages", userToken, new object[]
        {
            new { session_id = sessionId, user_id = userId, role = "user", content = userText, created_at = now },
            new { session_id = sessionId, user_id = userId, role = "assistant", content = assistantText, created_at = now.AddMilliseconds(1) },
        });

        // Menyentuh sesi supaya updated_at naik dan sesi terakhir muncul paling atas
        await Send<object>(HttpMethod.Patch, $"/chat_sessions?id=eq.{sessionId}", userToken,
            new { updated_at = now });
    }

    async Task<T?> Send<T>(HttpMethod method, string path, string userToken, object? body = null, bool returnRows = false)
    {
        using var request = new HttpRequestMessage(method, _restUrl + path);
        request.Headers.Add("apikey", _publishableKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", userToken);
        if (returnRows) request.Headers.Add("Prefer", "return=representation");
        if (body != null) request.Content = JsonContent.Create(body);

        var client = _httpClientFactory.CreateClient();
        using var response = await client.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            string detail = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Supabase {(int)response.StatusCode}: {detail}");
        }

        if (method == HttpMethod.Get || returnRows)
            return await response.Content.ReadFromJsonAsync<T>();
        return default;
    }

    record SessionRow([property: JsonPropertyName("id")] string Id);
}
