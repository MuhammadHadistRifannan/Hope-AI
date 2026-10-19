using System.Text.Json;
using System.Text.Json.Serialization;

namespace HopeAi;

// Hasil "Jelaskan dengan suaramu" di Flexa: seberapa jauh penjelasan siswa
// (diucapkan lalu diubah jadi teks) sesuai dengan isi materi.
public record ExplainResult(
    [property: JsonPropertyName("skor")] int Score,
    [property: JsonPropertyName("dipahami")] List<string> Understood,
    [property: JsonPropertyName("terlewat")] List<string> Missing,
    [property: JsonPropertyName("keliru")] List<string> Wrong,
    [property: JsonPropertyName("umpan_balik")] string Feedback);

public class ExplainCheckException : Exception
{
    public ExplainCheckException(string message) : base(message) { }
}

// Jawaban AI tidak dipercaya begitu saja: bentuknya diperiksa, skor dibatasi 0-100,
// dan daftar dipangkas supaya umpan balik tetap singkat untuk dibacakan.
public static class ExplainParser
{
    const int MaxItems = 4;

    public static ExplainResult Parse(string raw)
    {
        int start = raw.IndexOf('{');
        int end = raw.LastIndexOf('}');
        if (start < 0 || end <= start)
            throw new ExplainCheckException("Penilaian belum bisa dibuat: jawaban AI tidak berbentuk penilaian");

        ExplainResult? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<ExplainResult>(raw[start..(end + 1)]);
        }
        catch (JsonException)
        {
            throw new ExplainCheckException("Penilaian belum bisa dibuat: jawaban AI tidak bisa dibaca");
        }
        if (parsed == null || string.IsNullOrWhiteSpace(parsed.Feedback))
            throw new ExplainCheckException("Penilaian belum bisa dibuat: umpan balik kosong");

        static List<string> Clean(List<string>? items) =>
            (items ?? new List<string>())
                .Select(item => (item ?? "").Replace("*", "").Trim())
                .Where(item => item.Length > 0)
                .Take(MaxItems)
                .ToList();

        return new ExplainResult(
            Math.Clamp(parsed.Score, 0, 100),
            Clean(parsed.Understood),
            Clean(parsed.Missing),
            Clean(parsed.Wrong),
            parsed.Feedback.Replace("*", "").Trim());
    }
}
