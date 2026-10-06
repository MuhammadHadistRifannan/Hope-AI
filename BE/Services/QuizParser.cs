using System.Text.Json;
using System.Text.Json.Serialization;

namespace HopeAi;

public record QuizQuestion(
    [property: JsonPropertyName("q")] string Question,
    [property: JsonPropertyName("options")] List<string> Options,
    [property: JsonPropertyName("a")] string Answer,
    [property: JsonPropertyName("difficulty")] int Difficulty);

public class QuizGenerationException : Exception
{
    public QuizGenerationException(string message) : base(message) { }
}

// Jawaban AI tidak dipercaya begitu saja: hanya soal yang bentuknya benar yang diteruskan
public static class QuizParser
{
    const int MinValidQuestions = 3;

    public static List<QuizQuestion> Parse(string raw)
    {
        int start = raw.IndexOf('[');
        int end = raw.LastIndexOf(']');
        if (start < 0 || end <= start)
            throw new QuizGenerationException("Kuis belum bisa dibuat: jawaban AI tidak berbentuk daftar soal");

        List<QuizQuestion>? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<List<QuizQuestion>>(raw[start..(end + 1)]);
        }
        catch (JsonException)
        {
            throw new QuizGenerationException("Kuis belum bisa dibuat: jawaban AI tidak bisa dibaca");
        }

        var valid = new List<QuizQuestion>();
        foreach (var question in parsed ?? new List<QuizQuestion>())
        {
            if (question == null || string.IsNullOrWhiteSpace(question.Question)) continue;
            if (question.Options == null) continue;

            var options = question.Options
                .Where(option => !string.IsNullOrWhiteSpace(option))
                .Select(option => option.Trim())
                .Distinct()
                .ToList();
            string answer = (question.Answer ?? "").Trim();

            if (options.Count != 4 || !options.Contains(answer)) continue;

            valid.Add(new QuizQuestion(
                question.Question.Trim(),
                options,
                answer,
                Math.Clamp(question.Difficulty, 1, 3)));
        }

        if (valid.Count < MinValidQuestions)
            throw new QuizGenerationException("Kuis belum bisa dibuat dari teks ini. Coba teks yang lebih panjang.");

        return valid;
    }
}
