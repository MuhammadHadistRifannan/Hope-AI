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

        readonly IGeminiService _client; 
        readonly IChatHistoryService _history;
        readonly ModelAi _model; 

        public GeminiController(IGeminiService client , IChatHistoryService history)
        {
            _client = client;
            _history = history;
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
            try
            {
                sessionId = await _history.EnsureSession(userToken, userId, message.sessionId, text);
                history = await _history.GetRecentMessages(userToken, sessionId, HistoryLimit);
            }
            catch (ChatSessionNotFoundException e)
            {
                return NotFound(e.Message);
            }

            string response;
            try
            {
                response = await _client.Chat(_model, history, text);
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
    }


    public struct Message
    {
        public string text{get;set;}
        public string? sessionId{get;set;}
    }
}
