namespace HopeAi;

public interface ITtsService
{
    public Task<TtsResult> Synthesize(string text);
}
