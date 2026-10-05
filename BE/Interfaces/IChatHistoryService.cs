namespace HopeAi;

public interface IChatHistoryService
{
    public Task<string> EnsureSession(string userToken , string userId , string? sessionId , string firstMessage);

    public Task<List<ChatTurn>> GetRecentMessages(string userToken , string sessionId , int limit);

    public Task SaveExchange(string userToken , string userId , string sessionId , string userText , string assistantText);
}
