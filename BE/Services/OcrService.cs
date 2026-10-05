using System.Text;
using GeminiDotnet;
using GeminiDotnet.V1;
using GeminiDotnet.V1.Models;

namespace HopeAi;

public class OcrException : Exception
{
    public int StatusCode { get; }

    public OcrException(int statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}

public class OcrService : IOcrService
{
    public const long MaxFileSize = 10 * 1024 * 1024;

    static readonly Dictionary<string, string> _mimeByExtension = new()
    {
        [".pdf"] = "application/pdf",
        [".png"] = "image/png",
        [".jpg"] = "image/jpeg",
        [".jpeg"] = "image/jpeg",
        [".webp"] = "image/webp",
        [".txt"] = "text/plain",
    };

    readonly GeminiClient geminiClient;

    public OcrService(IConfiguration configuration)
    {
        // OCRKEY opsional, kalau kosong pakai APIKEY yang sama dengan chat
        string apiKey = configuration.GetSection("OCRKEY").Value
            ?? configuration.GetSection("APIKEY").Value!;

        geminiClient = new GeminiClient(new GeminiClientOptions
        {
            ApiKey = apiKey
        });
    }

    public async Task<string> ExtractText(IFormFile file, ModelAi model)
    {
        if (file == null || file.Length == 0)
            throw new OcrException(400, "File tidak valid");

        if (file.Length > MaxFileSize)
            throw new OcrException(413, "Ukuran file maksimal 10 MB");

        string mimeType = ResolveMimeType(file);

        using var ms = new MemoryStream();
        await file.CopyToAsync(ms);
        byte[] bytes = ms.ToArray();

        // File teks tidak perlu lewat AI
        if (mimeType == "text/plain")
            return Encoding.UTF8.GetString(bytes).Trim();

        var content = new GenerateContentRequest
        {
            Model = model.nameModel,
            Contents = new List<Content>
            {
                new Content
                {
                    Role = "user",
                    Parts = new List<Part>
                    {
                        new Part
                        {
                            Text = "Extract all readable text from this file. Keep the original language and reading order. Return raw text only."
                        },
                        new Part
                        {
                            InlineData = new Blob
                            {
                                MimeType = mimeType,
                                Data = bytes
                            }
                        }
                    }
                }
            }
        };

        try
        {
            var response = await geminiClient.V1.Models.GenerateContentAsync(model.nameModel, content);
            return response.Candidates![0].Content!.Parts![0].Text!.Trim();
        }
        catch (Exception e)
        {
            throw new OcrException(502, "Gagal mengekstrak teks: " + e.Message);
        }
    }

    static string ResolveMimeType(IFormFile file)
    {
        string extension = Path.GetExtension(file.FileName ?? "").ToLowerInvariant();

        if (_mimeByExtension.TryGetValue(extension, out var byExtension))
            return byExtension;

        // Hasil tangkapan kamera kadang dikirim tanpa nama file yang jelas
        string contentType = (file.ContentType ?? "").Split(';')[0].Trim().ToLowerInvariant();
        if (_mimeByExtension.ContainsValue(contentType))
            return contentType;

        throw new OcrException(415, "Format file tidak didukung. Gunakan PDF, JPG, PNG, atau TXT");
    }
}
