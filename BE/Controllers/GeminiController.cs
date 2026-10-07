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
        // Teks panjang dipotong di frontend; satu permintaan untuk satu potongan
        const int MaxTtsLength = 1200;

        readonly IGeminiService _client; 
        readonly IChatHistoryService _history;
        readonly ITtsService _tts;
        readonly ModelAi _model; 

        public GeminiController(IGeminiService client , IChatHistoryService history , ITtsService tts)
        {
            _client = client;
            _history = history;
            _tts = tts;
            _model = new ModelAi
            {
                nameModel = "gemini-2.5-flash"  
            };
        }

        [HttpPost("chat")]
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

            string response;
            try
            {
                response = await _client.Chat(_model, history, text, material);
            }
            catch (Exception e)
            {
                return StatusCode(502, "NeoTutor sedang tidak bisa menjawab: " + e.Message);
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
                return StatusCode(502, e.Message);
            }
            catch (Exception e)
            {
                return StatusCode(502, "Kuis belum bisa dibuat: " + e.Message);
            }
        }

        // Mengubah teks menjadi audio WAV dengan suara AI
        [HttpPost("tts")]
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
                return StatusCode(502, "Suara AI belum bisa dibuat: " + e.Message);
            }
        }

        [HttpPost("summary")]
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
                return StatusCode(502, "Versi sederhana belum bisa dibuat: " + e.Message);
            }
        }
    }


    public class ChatContext
    {
        // "document" (dokumen milik pengguna) atau "material" (bab materi)
        public string? type{get;set;}
        public string? id{get;set;}
    }

    public struct Message
    {
        public string text{get;set;}
        public string? sessionId{get;set;}
        // Diisi saat memulai percakapan tentang satu dokumen atau bab materi
        public ChatContext? context{get;set;}
    }
}
