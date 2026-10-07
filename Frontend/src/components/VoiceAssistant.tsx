import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Mic, MicOff } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { speak, stopSpeech } from "@/lib/speech";
import {
  destinationForPath,
  dispatchVoiceCommand,
  findControl,
  findDestination,
  helpText,
  normalizeCommand,
  pageHelp,
  visibleControls,
  VOICE_TOGGLE_EVENT,
} from "@/lib/voiceCommands";

// Tombol yang akibatnya sulit dibatalkan hanya ditekan bila diminta dengan jelas
// ("pilih hapus ..."), tidak dari ucapan sepintas.
const RISKY_CONTROL = /^(hapus|blokir|keluar|buang|cabut)/i;
const rateSteps = ["slow", "normal", "fast"];

// Asisten suara: satu tombol (atau Alt+M) untuk memberi perintah dengan suara,
// supaya aplikasi bisa dipakai tanpa melihat layar.
export default function VoiceAssistant() {
  const navigate = useNavigate();
  const location = useLocation();
  const { volume, speakingRate, aiVoice, autoPlayAudio, textSize, updateSetting } = useSettings();
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("");
  const recognitionRef = useRef<any>(null);
  const lastSaid = useRef("");
  const movedByVoice = useRef(false);

  // Tanggapan singkat memakai suara perangkat supaya terdengar seketika
  const say = useCallback(
    (text: string) => {
      setStatus(text);
      lastSaid.current = text;
      speak(text, { volume, rate: speakingRate, aiVoice: false });
    },
    [volume, speakingRate]
  );

  const pageName = useCallback(
    () => destinationForPath(location.pathname)?.name ?? document.querySelector("h1")?.textContent?.trim() ?? "ini",
    [location.pathname]
  );

  // Pengguna yang mengandalkan suara diberi tahu tiap kali halaman berganti
  const isFirstPage = useRef(true);
  useEffect(() => {
    if (isFirstPage.current) {
      isFirstPage.current = false;
      return;
    }
    if (movedByVoice.current) {
      movedByVoice.current = false;
      return;
    }
    if (autoPlayAudio) say(`Halaman ${pageName()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const press = useCallback(
    (control: { element: HTMLElement; name: string }) => {
      say(control.name);
      control.element.focus();
      control.element.click();
    },
    [say]
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

      if (/\b(bantuan|bantu aku|bantu saya|perintah apa|apa yang bisa)\b/.test(command)) {
        const hint = pageHelp[location.pathname];
        say(/lengkap|semua/.test(command) || !hint ? helpText : `${hint} Katakan bantuan lengkap untuk semua perintah.`);
        return;
      }

      // "tanya apa itu fotosintesis" membuka NeoTutor dan langsung mengirim pertanyaannya
      const question = command.match(/^(tanya|tanyakan|tolong jelaskan|jelaskan)\s+(.+)/);
      if (question) {
        const text = question[1].startsWith("tanya") ? question[2] : command;
        setStatus(`Bertanya: ${text}`);
        movedByVoice.current = location.pathname !== "/neotutor";
        navigate("/neotutor", { state: { voiceQuestion: text } });
        return;
      }

      // Halaman yang sedang terbuka didahulukan, misalnya menjawab soal kuis
      if (dispatchVoiceCommand(command)) {
        setStatus(`Perintah: ${command}`);
        return;
      }

      if (/^(di ?mana (saya|aku)|halaman apa( ini)?|ini halaman apa|(saya|aku) di ?mana)/.test(command)) {
        say(`Kamu di halaman ${pageName()}. ${pageHelp[location.pathname] ?? ""}`);
        return;
      }

      if (/^(ulangi|ulang|apa tadi|katakan lagi)$/.test(command) && lastSaid.current) {
        say(lastSaid.current);
        return;
      }

      if (/^(tombol apa saja|apa saja tombolnya|ada tombol apa|pilihan apa saja|apa saja pilihannya|menu apa saja|apa yang bisa (ditekan|dipilih))/.test(command)) {
        const main = document.getElementById("konten-utama");
        const names = visibleControls()
          .filter((control) => main?.contains(control.element))
          .slice(0, 12)
          .map((control) => control.name);
        say(
          names.length
            ? `Di halaman ini ada: ${names.join(", ")}. Katakan pilih, lalu namanya.`
            : "Tidak ada tombol di halaman ini. Katakan buka, lalu nama halaman."
        );
        return;
      }

      if (/^(kembali|balik|mundur)( ke (sebelumnya|belakang))?$/.test(command)) {
        const backButton = findControl("kembali", 60);
        if (backButton && document.getElementById("konten-utama")?.contains(backButton.element)) {
          press(backButton);
        } else {
          navigate(-1);
          say("Kembali");
        }
        return;
      }

      if (/^(gulir|geser|scroll) (ke )?(bawah|turun)|^(ke )?bawah$|^turun$/.test(command)) {
        window.scrollBy({ top: window.innerHeight * 0.8, behavior: "smooth" });
        setStatus("Menggulir ke bawah");
        return;
      }
      if (/^(gulir|geser|scroll) (ke )?(atas|naik)|^(ke )?atas$|^naik$/.test(command)) {
        window.scrollBy({ top: -window.innerHeight * 0.8, behavior: "smooth" });
        setStatus("Menggulir ke atas");
        return;
      }

      const slower = /(lebih pelan|pelankan|perlambat|terlalu cepat)/.test(command);
      if (slower || /(lebih cepat|percepat|terlalu pelan|terlalu lambat)/.test(command)) {
        const current = Math.max(0, rateSteps.indexOf(speakingRate));
        const next = rateSteps[Math.min(2, Math.max(0, current + (slower ? -1 : 1)))];
        updateSetting("speakingRate", next);
        lastSaid.current = slower ? "Suara dipelankan" : "Suara dipercepat";
        setStatus(lastSaid.current);
        speak(lastSaid.current, { volume, rate: next, aiVoice: false });
        return;
      }

      const bigger = /(perbesar|besarkan) (teks|tulisan|huruf)|(teks|tulisan|huruf) (lebih besar|terlalu kecil)/.test(command);
      if (bigger || /(perkecil|kecilkan) (teks|tulisan|huruf)|(teks|tulisan|huruf) (lebih kecil|terlalu besar)/.test(command)) {
        updateSetting("textSize", Math.min(100, Math.max(0, textSize + (bigger ? 15 : -15))));
        say(bigger ? "Teks diperbesar" : "Teks diperkecil");
        return;
      }

      if (/^(baca|bacakan)\b/.test(command)) {
        readPage();
        return;
      }

      // "pilih ringkasan", "tekan mulai kuis", "klik kirim": menekan tombol yang namanya disebut
      const pick = command.match(/^(pilih|tekan|klik|pencet|aktifkan|nyalakan|matikan|buka tab)\s+(.+)/);
      if (pick) {
        const control = findControl(pick[2], 40) ?? findControl(command, 40);
        if (control) {
          press(control);
          return;
        }
      }

      const destination = findDestination(command);
      if (destination) {
        movedByVoice.current = destination.path !== location.pathname;
        navigate(destination.path);
        say(`Membuka ${destination.name}`);
        return;
      }

      // Cukup menyebut nama tombol yang tampil di layar, misalnya "ringkasan" atau "mulai kuis".
      // "buka ..." juga dicoba di sini bila bukan nama halaman.
      const spoken = command.replace(/^(buka|bukakan|lihat|tampilkan)\s+/, "");
      const control = findControl(spoken, 80);
      if (control && !RISKY_CONTROL.test(control.name)) {
        press(control);
        return;
      }

      say("Maaf, perintah tidak dikenali. Katakan tombol apa saja untuk mendengar pilihan di layar, atau bantuan.");
    },
    [navigate, readPage, say, press, pageName, location.pathname, speakingRate, textSize, updateSetting, volume]
  );

  const startListening = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      say("Browser ini belum mendukung perintah suara. Gunakan Google Chrome, Microsoft Edge, atau Safari.");
      return;
    }
    // Browser hanya mengizinkan mikrofon di alamat https (atau localhost)
    if (!window.isSecureContext) {
      setStatus("Perintah suara hanya bisa dipakai lewat alamat https. Buka aplikasi dari alamat resminya.");
      return;
    }

    // Hentikan suara yang sedang diputar agar tidak ikut terdengar oleh mikrofon
    stopSpeech();

    // Safari di iPhone hanya mau bersuara bila pernah diminta langsung dari
    // sentuhan pengguna; ucapan kosong ini membuka izin itu untuk jawaban nanti.
    if ("speechSynthesis" in window) {
      const unlock = new SpeechSynthesisUtterance(" ");
      unlock.volume = 0;
      window.speechSynthesis.speak(unlock);
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    // Hasil sementara dipakai karena Safari sering tidak pernah menandai hasil
    // sebagai final dan tidak berhenti sendiri saat pengguna selesai bicara.
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let transcript = "";
    let handled = false;
    let failed = false;
    let silenceTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      if (handled || !transcript.trim()) return;
      handled = true;
      handleCommand(transcript);
    };
    // Berhenti sendiri setelah jeda bicara, atau bila tidak ada suara sama sekali
    const stopAfter = (ms: number) => {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => recognition.stop(), ms);
    };

    recognition.onresult = (event: any) => {
      transcript = Array.from(event.results as ArrayLike<any>)
        .map((result) => result[0].transcript)
        .join(" ");
      setStatus(`Mendengar: ${transcript}`);

      if (event.results[event.results.length - 1].isFinal) {
        clearTimeout(silenceTimer);
        finish();
        recognition.stop();
      } else {
        stopAfter(1500);
      }
    };
    recognition.onerror = (event: any) => {
      if (event.error === "aborted") return;
      failed = true;
      const messages: Record<string, string> = {
        "not-allowed": "Izin mikrofon ditolak. Izinkan mikrofon untuk situs ini di pengaturan browser.",
        "service-not-allowed":
          "Pengenalan suara dimatikan di perangkat ini. Di iPhone, nyalakan Dikte di Pengaturan, Umum, Papan Ketik, lalu izinkan mikrofon untuk Safari.",
        "no-speech": "Tidak terdengar suara. Coba lagi.",
        "audio-capture": "Mikrofon tidak ditemukan atau sedang dipakai aplikasi lain.",
        network: "Pengenalan suara butuh koneksi internet. Periksa koneksi lalu coba lagi.",
        "language-not-supported": "Perangkat ini belum mendukung pengenalan suara bahasa Indonesia.",
      };
      setStatus(messages[event.error] ?? `Perintah suara gagal (${event.error}). Coba lagi.`);
    };
    recognition.onend = () => {
      clearTimeout(silenceTimer);
      setIsListening(false);
      recognitionRef.current = null;
      if (!handled && transcript.trim()) finish();
      else if (!handled && !failed) setStatus("Tidak terdengar suara. Coba lagi.");
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setStatus("Mendengarkan...");
    try {
      recognition.start();
      stopAfter(8000);
    } catch (error) {
      console.error("Perintah suara gagal dimulai:", error);
      setIsListening(false);
      recognitionRef.current = null;
      setStatus("Perintah suara gagal dimulai. Coba lagi.");
    }
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
    <div data-voice-ignore className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col items-end gap-2">
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
