using System.Threading.Tasks;
using GeminiDotnet;
using GeminiDotnet.V1.Models;
using HopeAi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MyApp.Namespace
{
    [Route("/gemini/")]
    [ApiController]
    [Authorize]
    public class GeminiController : ControllerBase
    {
        // Jumlah pesan terakhir yang dikirim ke AI sebagai konteks
        const int HistoryLimit = 20;
        const int MaxMessageLength = 4000;
        const int MaxSummaryLength = 100000;
        const int MinQuizTextLength = 80;
        const int MaxQuizTextLength = 30000;
        const int QuizQuestionCount = 9;
        const int MaxSimplifyLength = 15000;
        // "Jelaskan dengan suaramu": materi dipotong bila sangat panjang; penjelasan siswa dibatasi
        const int MaxExplainMaterialLength = 15000;
        const int MinExplanationLength = 20;
        const int MaxExplanationLength = 3000;
        // Teks panjang dipotong di frontend; satu permintaan untuk satu potongan
        const int MaxTtsLength = 1200;

        readonly IGeminiService _client; 
        readonly IChatHistoryService _history;
        readonly ITtsService _tts;
        readonly ModelAi _model; 
        readonly ILogger<GeminiController> _logger;

        public GeminiController(IGeminiService client , IChatHistoryService history , ITtsService tts, ILogger<GeminiController> logger)
        {
            _client = client;
            _logger = logger;
            _history = history;
            _tts = tts;
            _model = new ModelAi
            {
                nameModel = "gemini-2.5-flash"  
            };
        }

        // Kegagalan layanan AI dikembalikan sebagai 503, bukan 502. Cloudflare di depan
        // server mengganti setiap balasan 502 dengan halaman errornya sendiri yang tidak
        // membawa header CORS, sehingga browser hanya melihat "diblokir CORS" dan pesan
        // aslinya hilang.
        ObjectResult Unavailable(string message) => StatusCode(StatusCodes.Status503ServiceUnavailable, message);

        [HttpPost("chat")]
        [EndpointSummary("Bertanya ke NeoTutor")]
        [EndpointDescription("Mengirim satu pesan. Sertakan sessionId untuk melanjutkan percakapan, atau context untuk membahas satu dokumen atau bab materi. Riwayat disimpan per pengguna.")]
        public async Task<IActionResult> GetResponses([FromBody] Message message)
        {
            string text = (message.text ?? "").Trim();
            if (text.Length == 0) return BadRequest("Pesan tidak boleh kosong");
            if (text.Length > MaxMessageLength) return BadRequest("Pesan terlalu panjang");

            string userId = User.FindFirst("sub")!.Value;
            string userToken = Request.Headers.Authorization.ToString()["Bearer ".Length..];

            string sessionId;
            List<ChatTurn> history;
            ChatMaterial? material;
            try
            {
                var session = await _history.EnsureSession(userToken, userId, message.sessionId, text,
                    message.context?.type, message.context?.id);
                sessionId = session.Id;
                material = await _history.GetMaterial(userToken, session);
                history = await _history.GetRecentMessages(userToken, sessionId, HistoryLimit);
            }
            catch (ChatSessionNotFoundException e)
            {
                return NotFound(e.Message);
            }
            catch (ChatContextNotFoundException e)
            {
                return NotFound(e.Message);
            }

            // Gemini sesekali gagal sesaat (sibuk atau jawaban kosong); dicoba sekali lagi
            string response;
            try
            {
                response = await _client.Chat(_model, history, text, material);
            }
            catch (Exception first)
            {
                _logger.LogWarning(first, "Chat Gemini gagal, dicoba sekali lagi");
                try
                {
                    await Task.Delay(800);
                    response = await _client.Chat(_model, history, text, material);
                }
                catch (Exception e)
                {
                    _logger.LogError(e, "Chat Gemini gagal dua kali");
                    return Unavailable("NeoTutor sedang tidak bisa menjawab: " + e.Message);
                }
            }

            var cleanResponse = response.Replace('*' , ' ');
            await _history.SaveExchange(userToken, userId, sessionId, text, cleanResponse);

            return Ok(new
            {
                status = "success" ,
                response = cleanResponse ,
                sessionId
            });
        }

        // Membuat soal pilihan ganda dari teks materi; dipakai kuis adaptif di frontend
        [HttpPost("quiz")]
        [EndpointSummary("Membuat kuis dari teks")]
        [EndpointDescription("Menghasilkan soal pilihan ganda bertingkat mudah, sedang, dan sulit dari teks materi (minimal 80 karakter).")]
        public async Task<IActionResult> Quiz([FromBody] Message message)
        {
            string text = (message.text ?? "").Trim();
            if (text.Length < MinQuizTextLength) return BadRequest("Teks terlalu pendek untuk dibuat kuis");
            if (text.Length > MaxQuizTextLength) text = text[..MaxQuizTextLength];

            try
            {
                var questions = await _client.GenerateQuiz(_model, text, QuizQuestionCount);
                return Ok(new { questions });
            }
            catch (QuizGenerationException e)
            {
                return Unavailable(e.Message);
            }
            catch (Exception e)
            {
                return Unavailable("Kuis belum bisa dibuat: " + e.Message);
            }
        }

        // Mengubah teks menjadi audio WAV dengan suara AI
        [HttpPost("tts")]
        [EndpointSummary("Mengubah teks menjadi suara")]
        [EndpointDescription("Mengembalikan audio WAV untuk teks sampai 1200 karakter. Header X-Tts-Cache berisi hit bila audio diambil dari cache. 429 bila kuota suara AI habis.")]
        public async Task<IActionResult> Speak([FromBody] Message message)
        {
            string text = (message.text ?? "").Trim();
            if (text.Length == 0) return BadRequest("Teks tidak boleh kosong");
            if (text.Length > MaxTtsLength) return BadRequest("Teks terlalu panjang");

            try
            {
                var result = await _tts.Synthesize(text);
                Response.Headers["X-Tts-Cache"] = result.FromCache ? "hit" : "miss";
                return File(result.Audio, "audio/wav");
            }
            catch (TtsQuotaException e)
            {
                return StatusCode(429, e.Message);
            }
            catch (Exception e)
            {
                return Unavailable("Suara AI belum bisa dibuat: " + e.Message);
            }
        }

        [HttpPost("summary")]
        [EndpointSummary("Meringkas teks")]
        [EndpointDescription("Ringkasan 3 sampai 5 kalimat dari teks materi.")]
        public async Task<IActionResult> Summary([FromBody] Message message)
        {
            string text = (message.text ?? "").Trim();
            if (text.Length == 0) return BadRequest("Teks tidak boleh kosong");
            if (text.Length > MaxSummaryLength) return BadRequest("Teks terlalu panjang");

            var ringkasan = await _client.Ringkasan(_model , text);
            var cleanResponse = ringkasan.Replace('*' , ' ');
            return Ok(new
            {
                message = cleanResponse
            });
        }

        // Versi bahasa sederhana dari sebuah materi
        [HttpPost("simplify")]
        [EndpointSummary("Menulis ulang teks dengan bahasa sederhana")]
        [EndpointDescription("Versi yang mudah dibaca untuk siswa dengan hambatan belajar. Teks di atas 15000 karakter dipotong dan ditandai truncated.")]
        public async Task<IActionResult> Simplify([FromBody] Message message)
        {
            string text = (message.text ?? "").Trim();
            if (text.Length == 0) return BadRequest("Teks tidak boleh kosong");

            bool truncated = text.Length > MaxSimplifyLength;
            if (truncated) text = text[..MaxSimplifyLength];

            try
            {
                string simple = await _client.Sederhanakan(_model, text);
                return Ok(new { message = simple, truncated });
            }
            catch (Exception e)
            {
                return Unavailable("Versi sederhana belum bisa dibuat: " + e.Message);
            }
        }

        // Teknik Feynman: siswa menjelaskan ulang materi dengan suara (sudah jadi teks),
        // AI menilai bagian yang dipahami, yang terlewat, dan yang keliru
        [HttpPost("explain-check")]
        [EndpointSummary("Menilai penjelasan ulang siswa atas materi")]
        [EndpointDescription("Untuk fitur Jelaskan dengan suaramu di Flexa. Mengembalikan skor 0-100, gagasan yang dipahami, terlewat, keliru, dan umpan balik singkat.")]
        public async Task<IActionResult> ExplainCheck([FromBody] ExplainRequest request)
        {
            string material = (request.material ?? "").Trim();
            string explanation = (request.explanation ?? "").Trim();
            if (material.Length == 0) return BadRequest("Materi tidak boleh kosong");
            if (explanation.Length < MinExplanationLength) return BadRequest("Penjelasan terlalu singkat. Coba jelaskan dengan beberapa kalimat.");
            if (explanation.Length > MaxExplanationLength) return BadRequest("Penjelasan terlalu panjang");
            if (material.Length > MaxExplainMaterialLength) material = material[..MaxExplainMaterialLength];

            try
            {
                var result = await _client.CekPemahaman(_model, material, explanation);
                return Ok(result);
            }
            catch (ExplainCheckException e)
            {
                _logger.LogWarning("Penilaian penjelasan gagal dibaca: {Message}", e.Message);
                return Unavailable(e.Message);
            }
            catch (Exception e)
            {
                _logger.LogWarning(e, "Penilaian penjelasan gagal");
                return Unavailable("Penilaian belum bisa dibuat: " + e.Message);
            }
        }
    }


    public class ChatContext
    {
        // "document" (dokumen milik pengguna) atau "material" (bab materi)
        public string? type{get;set;}
        public string? id{get;set;}
    }

    public class ExplainRequest
    {
        public string? material{get;set;}
        public string? explanation{get;set;}
    }

    public struct Message
    {
        public string text{get;set;}
        public string? sessionId{get;set;}
        // Diisi saat memulai percakapan tentang satu dokumen atau bab materi
        public ChatContext? context{get;set;}
    }
}
