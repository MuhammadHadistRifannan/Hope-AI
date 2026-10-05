namespace HopeAi;

public interface IOcrService
{
    public Task<string> ExtractText(IFormFile file, ModelAi model);
}
