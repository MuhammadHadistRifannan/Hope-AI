namespace HopeAi;

public interface IGeminiService
{
    public Task<string> Chat(ModelAi model , IReadOnlyList<ChatTurn> history , string message , ChatMaterial? material);

    public Task<string> Ringkasan(ModelAi model , string message);

    public Task<List<QuizQuestion>> GenerateQuiz(ModelAi model , string text , int count);
}
