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
        // Jawaban bisa terbagi ke beberapa bagian, atau kosong bila Gemini menahannya
        // (misalnya karena filter keamanan). Kosong diperlakukan sebagai kegagalan yang jelas.
        var parts = response.Candidates?.FirstOrDefault()?.Content?.Parts;
        var text = parts == null ? "" : string.Concat(parts.Select(part => part.Text ?? ""));
        if (string.IsNullOrWhiteSpace(text))
            throw new InvalidOperationException("Gemini tidak mengembalikan jawaban");
        return text;
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

    // "Jelaskan dengan suaramu" (teknik Feynman): siswa menjelaskan ulang materi dengan
    // kata-katanya sendiri, lalu AI menilai pemahamannya terhadap isi materi.
    public async Task<ExplainResult> CekPemahaman(ModelAi model, string material, string explanation)
    {
        string prompt = @"
Kamu guru yang sabar dan ramah. Seorang siswa baru saja membaca MATERI di bawah, lalu menjelaskan ulang
isinya dengan kata-katanya sendiri secara lisan. Penjelasannya diubah menjadi teks oleh pengenal suara,
jadi abaikan salah ketik, ejaan, tanda baca, dan kata yang terdengar mirip. Nilai PEMAHAMAN, bukan tata bahasa.

Nilai hanya berdasarkan MATERI. Jangan menuntut hal yang tidak ada di materi.

Kembalikan HANYA satu objek JSON tanpa teks lain dan tanpa blok kode, dengan bentuk:
{""skor"": 0-100,
 ""dipahami"": [""gagasan dari materi yang sudah dijelaskan dengan benar""],
 ""terlewat"": [""gagasan penting dari materi yang belum disebut""],
 ""keliru"": [""bagian penjelasan yang salah, ditulis sebagai koreksi singkat yang benar""],
 ""umpan_balik"": ""2 sampai 3 kalimat pendek untuk siswa""}

Aturan:
- Tiap daftar paling banyak 3 butir, tiap butir satu kalimat pendek (paling banyak 12 kata).
- Daftar boleh kosong bila memang tidak ada.
- umpan_balik memakai bahasa sederhana, menyapa dengan ""kamu"", dimulai dengan hal yang sudah bagus,
  lalu satu saran paling penting. Jangan pakai markdown atau tanda bintang.
- Bila penjelasan tidak berhubungan dengan materi atau terlalu singkat, beri skor rendah dan minta
  siswa mencoba lagi dengan ramah.

MATERI:
" + material + @"

PENJELASAN SISWA:
" + explanation;

        var content = new GenerateContentRequest
        {
            Model = model.nameModel,
            Contents = new List<Content> { TextContent("user", prompt) }
        };

        var response = await client.V1.Models.GenerateContentAsync(model.nameModel, content);
        var parts = response.Candidates?.FirstOrDefault()?.Content?.Parts;
        var raw = parts == null ? "" : string.Concat(parts.Select(part => part.Text ?? ""));
        return ExplainParser.Parse(raw);
    }

    // Menulis ulang materi dengan bahasa yang mudah dipahami, untuk siswa dengan
    // hambatan belajar atau yang baru belajar membaca. Isi tidak boleh berubah.
    public async Task<string> Sederhanakan(ModelAi model, string text)
    {
        string prompt = @"
Tulis ulang teks pelajaran berikut dengan bahasa Indonesia yang sangat mudah dipahami,
untuk siswa yang kesulitan membaca teks panjang.

Aturan:
- Pakai kalimat pendek, paling banyak sekitar 12 kata per kalimat.
- Pakai kata sehari-hari. Bila ada istilah sulit yang penting, tetap tulis istilahnya lalu jelaskan artinya dalam kurung.
- Satu paragraf berisi satu gagasan, paling banyak 3 kalimat. Pisahkan paragraf dengan satu baris kosong.
- Pertahankan semua fakta, angka, dan nama penting. Jangan menambah fakta baru dan jangan memberi pendapat.
- Jangan pakai markdown, tanda bintang, daftar bernomor, atau judul.
- Kembalikan hanya teks hasil tulis ulang, tanpa kalimat pembuka atau penutup.

TEKS:
" + text;

        var content = new GenerateContentRequest
        {
            Model = model.nameModel,
            Contents = new List<Content> { TextContent("user", prompt) }
        };

        var response = await client.V1.Models.GenerateContentAsync(model.nameModel, content);
        return response.Candidates![0].Content!.Parts![0].Text!.Replace("*", "").Trim();
    }

}
