using System.Net.Mime;
using System.Runtime.CompilerServices;
using GeminiDotnet;
using GeminiDotnet.V1;
using GeminiDotnet.V1.Models;


namespace HopeAi;


public struct ModelAi
{
    public string nameModel { get; set; }
}


public class GeminiService : IGeminiService
{
    const string Persona = @"Nama mu adalah Neotutor , Kamu adalah tutor belajar yang sangat ramah, sabar, dan komunikatif.
                        Jawablah dengan:
                        - Bahasa sederhana
                        - Kalimat pendek
                        - Contoh konkret bila perlu
                        - Tidak bertele-tele
                        - Berorientasi pada pemahaman pelajar
                        - Jelaskan konsep dengan cara paling mudah dipahami
                        - Usahakan ala Gen z supaya pembicaraan tidak terlalu kaku

                        Jika pertanyaan terlalu luas, jelaskan dengan ringkas dan beri langkah-langkah.";

    readonly GeminiClient client;

    public GeminiService(IConfiguration _config)
    {
        client = new GeminiClient(new GeminiClientOptions
        {
            ApiKey = _config.GetSection("APIKEY").Value!
        });
    }

    // Tidak menyimpan apa pun di service: riwayat dikirim per permintaan,
    // sehingga percakapan antar pengguna tidak pernah tercampur.
    public async Task<string> Chat(ModelAi model, IReadOnlyList<ChatTurn> history, string message, ChatMaterial? material)
    {
        var contents = new List<Content>
        {
            TextContent("user", Persona),
            TextContent("model", "Siap, aku Neotutor!"),
        };

        // Bila sesi membahas satu materi, jawaban didasarkan pada materi itu
        if (material != null)
        {
            contents.Add(TextContent("user",
                $"Pelajar sedang mempelajari materi berjudul \"{material.Title}\". " +
                "Jawab pertanyaannya berdasarkan materi di bawah ini. " +
                "Kalau jawabannya tidak ada di materi, katakan terus terang bahwa materi tidak membahasnya, " +
                "baru kemudian bantu dengan pengetahuan umum.\n\nMATERI:\n" + material.Content));
            contents.Add(TextContent("model", "Oke, aku sudah baca materinya. Mau tanya apa?"));
        }

        foreach (var turn in history)
        {
            contents.Add(TextContent(turn.Role == "assistant" ? "model" : "user", turn.Content));
        }

        contents.Add(TextContent("user", message));

        var content = new GenerateContentRequest
        {
            Model = model.nameModel,
            Contents = contents
        };

        var response = await client.V1.Models.GenerateContentAsync(model.nameModel, content);
        return response.Candidates![0].Content!.Parts![0].Text!;
    }

    static Content TextContent(string role, string text)
    {
        return new Content
        {
            Role = role,
            Parts = new List<Part>
            {
                new Part { Text = text }
            }
        };
    }

    public async Task<List<QuizQuestion>> GenerateQuiz(ModelAi model, string text, int count)
    {
        string prompt = $@"Buat {count} soal pilihan ganda dalam Bahasa Indonesia HANYA berdasarkan teks di bawah.
Aturan:
- Tiap soal punya tepat 4 pilihan jawaban yang berbeda.
- Nilai ""a"" harus sama persis dengan salah satu pilihan.
- ""difficulty"": 1 untuk mudah (mengingat), 2 untuk sedang (memahami), 3 untuk sulit (menerapkan). Bagi rata.
- Gunakan kalimat pendek dan sederhana.
Kembalikan HANYA array JSON tanpa teks lain dan tanpa blok kode, dengan bentuk:
[{{""q"": ""pertanyaan"", ""options"": [""A"", ""B"", ""C"", ""D""], ""a"": ""A"", ""difficulty"": 1}}]

TEKS:
" + text;

        var content = new GenerateContentRequest
        {
            Model = model.nameModel,
            Contents = new List<Content> { TextContent("user", prompt) }
        };

        var response = await client.V1.Models.GenerateContentAsync(model.nameModel, content);
        string raw = response.Candidates![0].Content!.Parts![0].Text!;
        return QuizParser.Parse(raw);
    }

    public async Task<string> Ringkasan(ModelAi model, string message)
    {
        var content = new GenerateContentRequest
        {
            Model = model.nameModel,
            Contents = new List<Content>
            {
                new Content
                {
                    Role = "user" ,
                    Parts = new List<Part>
                    {
                        new Part
                        {
                            Text = $@"
                                Ringkas teks berikut dalam 3–5 kalimat.
                                Jangan beri pendahuluan, jangan beri label jenis teks, jangan beri opini.
                                Kembalikan *hanya* ringkasan. Tidak boleh hal lain. 
                                TEKS : " + message
                        }
                    }
                }
            }
        };

        try
        {
            var response = await client.V1.Models.GenerateContentAsync(content.Model, content);
            return response.Candidates![0].Content!.Parts![0].Text!;
        }
        catch (Exception e)
        {
            return "Tidak dapat membuat ringkasan." + e.Message;
        }

    }

}
