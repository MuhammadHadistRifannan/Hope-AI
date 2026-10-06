using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace HopeAi;

public record ChatTurn(
    [property: JsonPropertyName("role")] string Role,
    [property: JsonPropertyName("content")] string Content);

// Sesi chat; bisa terkait satu dokumen milik pengguna atau satu bab materi
public record ChatSession(string Id, string? DocumentId, string? MaterialId);

// Bahan belajar yang menjadi dasar jawaban NeoTutor
public record ChatMaterial(
    [property: JsonPropertyName("title")] string Title,
    [property: JsonPropertyName("content")] string Content);

public class ChatSessionNotFoundException : Exception
{
    public ChatSessionNotFoundException() : base("Sesi percakapan tidak ditemukan") { }
}

public class ChatContextNotFoundException : Exception
{
    public ChatContextNotFoundException() : base("Materi yang ingin dibahas tidak ditemukan") { }
}

// Riwayat chat disimpan di Supabase memakai token milik pengguna,
// jadi RLS memastikan tiap pengguna hanya menyentuh percakapannya sendiri.
public class ChatHistoryService : IChatHistoryService
{
    // Batas panjang materi yang ikut dikirim ke AI
    const int MaxMaterialLength = 30000;
    static readonly Regex SlugPattern = new("^[a-z0-9-]{1,40}$");

    readonly IHttpClientFactory _httpClientFactory;
    readonly string _restUrl;
    readonly string _publishableKey;

    public ChatHistoryService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _restUrl = configuration["Supabase:Url"]!.TrimEnd('/') + "/rest/v1";
        _publishableKey = configuration["Supabase:PublishableKey"]!;
    }

    public async Task<ChatSession> EnsureSession(string userToken, string userId, string? sessionId, string firstMessage, string? contextType, string? contextId)
    {
        if (!string.IsNullOrEmpty(sessionId))
        {
            if (!Guid.TryParse(sessionId, out var parsed)) throw new ChatSessionNotFoundException();

            var found = await Send<List<SessionRow>>(HttpMethod.Get,
                $"/chat_sessions?id=eq.{parsed}&select=id,document_id,material_id", userToken);
            if (found == null || found.Count == 0) throw new ChatSessionNotFoundException();
            return new ChatSession(found[0].Id, found[0].DocumentId, found[0].MaterialId);
        }

        string title = firstMessage.Length > 60 ? firstMessage[..60] + "..." : firstMessage;
        string? documentId = null;
        string? materialId = null;

        // Materi dicari memakai token pengguna, jadi dokumen orang lain tidak akan ditemukan
        if (contextType == "document")
        {
            if (!Guid.TryParse(contextId, out var docId)) throw new ChatContextNotFoundException();
            var docs = await Send<List<ContextRow>>(HttpMethod.Get,
                $"/user_documents?id=eq.{docId}&select=id,title", userToken);
            if (docs == null || docs.Count == 0) throw new ChatContextNotFoundException();
            documentId = docs[0].Id;
            title = "Tanya: " + docs[0].Title;
        }
        else if (contextType == "material")
        {
            if (contextId == null || !SlugPattern.IsMatch(contextId)) throw new ChatContextNotFoundException();
            var materials = await Send<List<ContextRow>>(HttpMethod.Get,
                $"/materials?slug=eq.{contextId}&select=id,title", userToken);
            if (materials == null || materials.Count == 0) throw new ChatContextNotFoundException();
            materialId = materials[0].Id;
            title = "Tanya: " + materials[0].Title;
        }

        if (title.Length > 80) title = title[..80] + "...";

        var created = await Send<List<SessionRow>>(HttpMethod.Post,
            "/chat_sessions?select=id,document_id,material_id", userToken,
            new { user_id = userId, title, document_id = documentId, material_id = materialId }, returnRows: true);
        return new ChatSession(created![0].Id, created[0].DocumentId, created[0].MaterialId);
    }

    public async Task<ChatMaterial?> GetMaterial(string userToken, ChatSession session)
    {
        string? path = session.DocumentId != null
            ? $"/user_documents?id=eq.{session.DocumentId}&select=title,content"
            : session.MaterialId != null
                ? $"/materials?id=eq.{session.MaterialId}&select=title,content"
                : null;
        if (path == null) return null;

        var rows = await Send<List<ChatMaterial>>(HttpMethod.Get, path, userToken);
        if (rows == null || rows.Count == 0) return null;

        var material = rows[0];
        return material.Content.Length > MaxMaterialLength
            ? material with { Content = material.Content[..MaxMaterialLength] }
            : material;
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

    record SessionRow(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("document_id")] string? DocumentId,
        [property: JsonPropertyName("material_id")] string? MaterialId);

    record ContextRow(
        [property: JsonPropertyName("id")] string Id,
        [property: JsonPropertyName("title")] string Title);
}
