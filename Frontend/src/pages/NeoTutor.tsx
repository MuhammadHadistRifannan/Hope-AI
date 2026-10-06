import { API_URL, authHeaders } from "@/lib/api";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Volume2, Mic, MicOff, Plus } from "lucide-react"; // Import ikon Mic
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSettings } from "@/context/SettingsContext"; // Import Settings Context
import { supabase } from "@/integrations/supabase/client";

// Definisi tipe SpeechRecognition untuk TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatSession = {
  id: string;
  title: string;
};

// Sapaan pembuka; hanya tampilan, tidak disimpan ke riwayat
const welcomeMessage: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Halo! Saya NeoTutor, asisten belajar AI Anda. Tanyakan apa saja tentang pekerjaan rumah Anda!"
};

export default function NeoTutor() {
  // --- STATE ASLI ---
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);

  // --- STATE SESI PERCAKAPAN ---
  // Tiap sesi punya ingatannya sendiri; null berarti percakapan baru yang belum tersimpan
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  // --- STATE INPUT SUARA (BARU) ---
  const [isListening, setIsListening] = useState(false);

  const quickQuestions = [
    "Bantu saya dengan PR matematika",
    "Jelaskan fotosintesis",
    "Apa itu gravitasi?",
    "Bagaimana cara menulis esai?",
  ];

  // --- SETTINGS INTEGRATION ---
  const { volume, speakingRate, autoPlayAudio } = useSettings(); 
  const [isSpeaking, setIsSpeaking] = useState(false);

  // --- FUNGSI AUDIO (TEXT TO SPEECH) ---
  const speakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "id-ID";
      
      utterance.volume = volume / 100;
      if (speakingRate === 'slow') utterance.rate = 0.8;
      else if (speakingRate === 'fast') utterance.rate = 1.2;
      else utterance.rate = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  // --- RIWAYAT PERCAKAPAN ---
  const loadSessions = async () => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .select("id, title")
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("Gagal memuat daftar percakapan:", error);
      return [];
    }
    setSessions(data);
    return data;
  };

  const openSession = async (id: string) => {
    window.speechSynthesis?.cancel();
    setSessionId(id);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, role, content")
      .eq("session_id", id)
      .order("created_at");

    if (error) {
      console.error("Gagal memuat percakapan:", error);
      return;
    }
    setMessages([
      welcomeMessage,
      ...data.map((row) => ({
        id: row.id,
        role: row.role as Message["role"],
        content: row.content,
      })),
    ]);
  };

  const startNewSession = () => {
    window.speechSynthesis?.cancel();
    setSessionId(null);
    setMessages([welcomeMessage]);
  };

  // Saat halaman dibuka, lanjutkan percakapan terakhir pengguna
  useEffect(() => {
    loadSessions().then((loaded) => {
      if (loaded.length > 0) openSession(loaded[0].id);
    });
  }, []);

  // --- FUNGSI INPUT SUARA (SPEECH TO TEXT) - BARU ---
  const startListening = () => {
    // Cek kompatibilitas browser
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Browser Anda tidak mendukung fitur Input Suara. Coba gunakan Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID"; // Set bahasa Indonesia
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const speechResult = event.results[0][0].transcript;
      setInput(speechResult); // Masukkan hasil suara ke input text
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Error speech recognition:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  // --- LOGIKA ASLI: CONNECT TO BACKEND GEMINI ---
  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`${API_URL}/gemini/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeaders())
        },
        body: JSON.stringify({ text, sessionId })
      });

      if (!response.ok) {
        throw new Error((await response.text()) || `Server error ${response.status}`);
      }

      const data = await response.json();

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response || "Tidak ada respons dari server."
      };

      setMessages(prev => [...prev, aiMessage]);
      if (autoPlayAudio) speakText(aiMessage.content);

      // Percakapan baru mendapat sesi dari server pada pesan pertamanya
      if (data.sessionId && data.sessionId !== sessionId) {
        setSessionId(data.sessionId);
        loadSessions();
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Terjadi kesalahan saat menghubungi server."
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 pb-20 md:pb-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">
            NeoTutor
          </h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Tutor AI pribadi Anda, tersedia 24/7 untuk membantu Anda belajar
          </p>
        </div>

        {/* Pilih percakapan: tiap percakapan diingat terpisah */}
        <div className="flex gap-2 mb-4">
          <Select value={sessionId ?? ""} onValueChange={openSession}>
            <SelectTrigger className="flex-1" aria-label="Pilih percakapan">
              <SelectValue placeholder="Percakapan baru" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={startNewSession} disabled={isTyping}>
            <Plus className="w-4 h-4 mr-2" />
            Percakapan Baru
          </Button>
        </div>

        <Card className="h-[calc(100vh-250px)] md:h-[600px] flex flex-col">
          {/* Chat Messages */}
          <ScrollArea className="flex-1 p-4 md:p-6">
            <div className="space-y-4" role="log" aria-live="polite" aria-label="Percakapan dengan NeoTutor">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.07 }}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col gap-1 max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {message.content}
                      </p>
                    </div>
                    
                    {message.role === "assistant" && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="self-start h-6 px-2 text-xs text-muted-foreground hover:text-primary"
                        onClick={() => speakText(message.content)}
                      >
                        <Volume2 className="w-3 h-3 mr-1" /> Dengar
                      </Button>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}

              {isTyping && (
                <div className="flex gap-3" role="status" aria-label="NeoTutor sedang mengetik">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-muted rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Questions */}
          <div className="px-4 md:px-6 py-3 border-t">
            <div className="flex gap-2 flex-wrap mb-3">
              {quickQuestions.map((question) => (
                <Button
                  key={question}
                  variant="outline"
                  size="sm"
                  onClick={() => sendMessage(question)}
                  className="text-xs"
                >
                  {question}
                </Button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-4 md:p-6 border-t">
            {/* Indikator Mendengarkan */}
            {isListening && (
               <div role="status" className="text-center text-xs text-primary animate-pulse mb-2 font-bold">
                 🎤 Mendengarkan... Silakan bicara...
               </div>
            )}
            
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              {/* TOMBOL MICROPHONE (BARU) */}
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={startListening}
                className={isListening ? "bg-red-100 text-red-600 border-red-200" : ""}
                title="Input Suara (Voice Note)"
                aria-label={isListening ? "Hentikan input suara" : "Mulai input suara"}
                aria-pressed={isListening}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </Button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Sedang mendengarkan..." : "Tanyakan apa saja..."}
                aria-label="Pertanyaan untuk NeoTutor"
                className="flex-1"
              />
              
              <Button type="submit" className="bg-primary" aria-label="Kirim pertanyaan">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
