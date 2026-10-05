namespace HopeAi;

public interface IGeminiService
{
    public Task<string> Chat(ModelAi model , IReadOnlyList<ChatTurn> history , string message);

    public Task<string> Ringkasan(ModelAi model , string message);
}
