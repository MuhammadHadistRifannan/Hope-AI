import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { speak, stopSpeech } from "@/lib/speech";
import {
  dispatchVoiceCommand,
  findDestination,
  helpText,
  normalizeCommand,
  VOICE_TOGGLE_EVENT,
} from "@/lib/voiceCommands";

// Asisten suara: satu tombol (atau Alt+M) untuk memberi perintah dengan suara,
// supaya aplikasi bisa dipakai tanpa melihat layar.
export default function VoiceAssistant() {
  const navigate = useNavigate();
  const { volume, speakingRate, aiVoice } = useSettings();
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("");
  const recognitionRef = useRef<any>(null);

  // Tanggapan singkat memakai suara perangkat supaya terdengar seketika
  const say = useCallback(
    (text: string) => {
      setStatus(text);
      speak(text, { volume, rate: speakingRate, aiVoice: false });
    },
    [volume, speakingRate]
  );

  const readPage = useCallback(() => {
    const main = document.getElementById("konten-utama");
    const text = (main?.innerText ?? "").replace(/\s+/g, " ").trim().slice(0, 3000);
    if (!text) {
      say("Halaman ini tidak punya teks untuk dibacakan.");
      return;
    }
    setStatus("Membacakan halaman");
    speak(text, { volume, rate: speakingRate, aiVoice });
  }, [say, volume, speakingRate, aiVoice]);

  const handleCommand = useCallback(
    (transcript: string) => {
      const command = normalizeCommand(transcript);
      if (!command) return;

      if (/^(berhenti|stop|diam|hentikan|cukup)\b/.test(command)) {
        stopSpeech();
        setStatus("Suara dihentikan");
        return;
      }

      if (/\b(bantuan|bantu aku|perintah apa)\b/.test(command)) {
        say(helpText);
        return;
      }

      // "tanya apa itu fotosintesis" membuka NeoTutor dan langsung mengirim pertanyaannya
      const question = command.match(/^(tanya|tanyakan|tolong jelaskan|jelaskan)\s+(.+)/);
      if (question) {
        const text = question[1].startsWith("tanya") ? question[2] : command;
        setStatus(`Bertanya: ${text}`);
        navigate("/neotutor", { state: { voiceQuestion: text } });
        return;
      }

      // Halaman yang sedang terbuka didahulukan, misalnya menjawab soal kuis
      if (dispatchVoiceCommand(command)) {
        setStatus(`Perintah: ${command}`);
        return;
      }

      if (/^(baca|bacakan)\b/.test(command)) {
        readPage();
        return;
      }

      const destination = findDestination(command);
      if (destination) {
        navigate(destination.path);
        say(`Membuka ${destination.name}`);
        return;
      }

      say("Maaf, perintah tidak dikenali. Katakan bantuan untuk mendengar daftar perintah.");
    },
    [navigate, readPage, say]
  );

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      say("Browser ini belum mendukung perintah suara. Gunakan Google Chrome atau Microsoft Edge.");
      return;
    }

    // Hentikan suara yang sedang diputar agar tidak ikut terdengar oleh mikrofon
    stopSpeech();

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      handleCommand(event.results[0][0].transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setStatus("Izin mikrofon ditolak. Izinkan mikrofon di browser untuk memakai perintah suara.");
      } else if (event.error === "no-speech") {
        setStatus("Tidak terdengar suara. Coba lagi.");
      }
    };
    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setStatus("Mendengarkan...");
    recognition.start();
  }, [handleCommand, say]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    startListening();
  }, [startListening]);

  // Alt+M memulai atau menghentikan perintah suara dari halaman mana pun
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(VOICE_TOGGLE_EVENT, toggle);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(VOICE_TOGGLE_EVENT, toggle);
    };
  }, [toggle]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <p
        role="status"
        aria-live="polite"
        className={
          status
            ? "max-w-xs px-3 py-2 rounded-lg bg-foreground text-background text-sm shadow-lg"
            : "sr-only"
        }
      >
        {status}
      </p>
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isListening}
        aria-label={
          isListening
            ? "Berhenti mendengarkan"
            : "Perintah suara. Tekan lalu bicara, atau tekan Alt M. Katakan bantuan untuk daftar perintah."
        }
        title="Perintah suara (Alt+M)"
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 border-white/40 text-white transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-ring ${
          isListening ? "bg-red-600 animate-pulse" : "bg-primary hover:bg-primary/90"
        }`}
      >
        {isListening ? (
          <MicOff className="w-6 h-6" aria-hidden="true" />
        ) : (
          <Mic className="w-6 h-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
