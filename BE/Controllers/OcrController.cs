using HopeAi;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace MyApp.Namespace
{
    [Route("/scan/")]
    [ApiController]
    [Authorize]
    public class OcrController : ControllerBase
    {
        readonly IOcrService ocrService;
        readonly ModelAi _model;

        public OcrController(IOcrService _service)
        {
            ocrService = _service;
            _model = new ModelAi
            {
                nameModel = "gemini-2.5-flash"
            };
        }

        [HttpPost("ocr")]
        [EndpointSummary("Membaca teks dari foto")]
        [EndpointDescription("Menerima satu gambar (field image) dan mengembalikan teks yang terbaca.")]
        [RequestSizeLimit(OcrService.MaxFileSize + 1024 * 1024)]
        public async Task<IActionResult> GetOcrResult([FromForm] IFormFile image)
        {
            try
            {
                string res = await ocrService.ExtractText(image, _model);
                return Ok(res);
            }
            catch (OcrException e)
            {
                return StatusCode(e.StatusCode, e.Message);
            }
        }

        [HttpPost("extract")]
        [EndpointSummary("Mengambil teks dari dokumen")]
        [EndpointDescription("Menerima PDF, gambar, atau berkas teks (field file, maksimal 10 MB) dan mengembalikan isinya sebagai teks.")]
        [RequestSizeLimit(OcrService.MaxFileSize + 1024 * 1024)]
        public async Task<IActionResult> ExtractDocument([FromForm] IFormFile file)
        {
            try
            {
                string res = await ocrService.ExtractText(file, _model);
                return Ok(new
                {
                    text = res
                });
            }
            catch (OcrException e)
            {
                return StatusCode(e.StatusCode, new
                {
                    text = e.Message
                });
            }
        }
    }
}
