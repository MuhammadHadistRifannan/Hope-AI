using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace HopeAi;

public record TtsResult(byte[] Audio, bool FromCache);

public class TtsQuotaException : Exception
{
    public TtsQuotaException() : base("Kuota suara AI sedang habis") { }
}

// Teks dikirim apa adanya, tanpa arahan gaya: saat diuji, arahan seperti
// "bacakan dengan ramah: ..." kadang ikut dibacakan. Nada suara ditentukan pilihan voice.
// Suara natural dari Gemini TTS. Audio disimpan di disk berdasarkan isi teksnya,
// jadi teks yang sama hanya dibuat sekali dan permintaan berikutnya tidak memakai kuota.
public class TtsService : ITtsService
{
    const string Endpoint = "https://generativelanguage.googleapis.com/v1beta/models";
    const int MaxCachedFiles = 3000;
    // Ubah nilai ini bila gaya bicara diganti, supaya audio lama tidak dipakai lagi
    const string StyleVersion = "v3";

    readonly IHttpClientFactory _httpClientFactory;
    readonly ILogger<TtsService> _logger;
    readonly string _apiKey;
    readonly string _voice;
    readonly string[] _models;
    readonly string _cacheDir;

    public TtsService(IHttpClientFactory httpClientFactory, IConfiguration configuration, ILogger<TtsService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _apiKey = configuration["APIKEY"]!;
        _voice = configuration["Tts:Voice"] ?? "Leda";
        // Kuota dihitung per model, jadi model kedua dipakai saat yang pertama penuh
        _models = configuration.GetSection("Tts:Models").Get<string[]>()
            ?? new[] { "gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts" };
        _cacheDir = configuration["Tts:CacheDir"] ?? Path.Combine(Path.GetTempPath(), "hopeai-tts");
        Directory.CreateDirectory(_cacheDir);
    }

    public async Task<TtsResult> Synthesize(string text)
    {
        string path = Path.Combine(_cacheDir, CacheKey(text) + ".wav");
        if (File.Exists(path))
        {
            return new TtsResult(await File.ReadAllBytesAsync(path), FromCache: true);
        }

        byte[] audio = await Generate(text);

        // Tulis ke berkas sementara dulu agar pembaca lain tidak mendapat berkas setengah jadi
        string temp = path + "." + Guid.NewGuid().ToString("N") + ".tmp";
        await File.WriteAllBytesAsync(temp, audio);
        File.Move(temp, path, overwrite: true);
        TrimCache();

        return new TtsResult(audio, FromCache: false);
    }

    async Task<byte[]> Generate(string text)
    {
        var body = new
        {
            contents = new[] { new { parts = new[] { new { text } } } },
            generationConfig = new
            {
                responseModalities = new[] { "AUDIO" },
                speechConfig = new
                {
                    voiceConfig = new { prebuiltVoiceConfig = new { voiceName = _voice } }
                }
            }
        };

        bool quotaHit = false;
        foreach (string model in _models)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, $"{Endpoint}/{model}:generateContent");
            request.Headers.Add("x-goog-api-key", _apiKey);
            request.Content = JsonContent.Create(body);

            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(90);
            using var response = await client.SendAsync(request);

            if ((int)response.StatusCode == 429)
            {
                quotaHit = true;
                _logger.LogWarning("Kuota TTS habis untuk model {Model}", model);
                continue;
            }

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("TTS gagal di model {Model}: {Status}", model, (int)response.StatusCode);
                continue;
            }

            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            string? data = null;
            if (json.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0
                && candidates[0].TryGetProperty("content", out var content)
                && content.TryGetProperty("parts", out var parts) && parts.GetArrayLength() > 0
                && parts[0].TryGetProperty("inlineData", out var inlineData)
                && inlineData.TryGetProperty("data", out var dataElement))
            {
                data = dataElement.GetString();
            }

            if (!string.IsNullOrEmpty(data)) return Convert.FromBase64String(data);
        }

        if (quotaHit) throw new TtsQuotaException();
        throw new InvalidOperationException("Suara AI belum bisa dibuat");
    }

    string CacheKey(string text)
    {
        byte[] hash = SHA256.HashData(Encoding.UTF8.GetBytes($"{StyleVersion}|{_voice}|{text}"));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    // Menjaga folder cache tidak tumbuh tanpa batas: buang berkas yang paling lama tidak dipakai
    void TrimCache()
    {
        try
        {
            var files = new DirectoryInfo(_cacheDir).GetFiles("*.wav");
            if (files.Length <= MaxCachedFiles) return;

            foreach (var file in files.OrderBy(f => f.LastAccessTimeUtc).Take(files.Length - MaxCachedFiles + 200))
            {
                file.Delete();
            }
        }
        catch (Exception e)
        {
            _logger.LogWarning(e, "Gagal merapikan cache TTS");
        }
    }
}
