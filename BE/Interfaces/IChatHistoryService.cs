namespace HopeAi;

public interface IChatHistoryService
{
    public Task<ChatSession> EnsureSession(string userToken , string userId , string? sessionId , string firstMessage , string? contextType , string? contextId);

    public Task<ChatMaterial?> GetMaterial(string userToken , ChatSession session);

    public Task<List<ChatTurn>> GetRecentMessages(string userToken , string sessionId , int limit);

    public Task SaveExchange(string userToken , string userId , string sessionId , string userText , string assistantText);
}
