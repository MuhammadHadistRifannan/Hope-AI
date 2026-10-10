import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Keyboard, Mic, MicOff, X } from "lucide-react";
import { useSettings } from "@/context/SettingsContext";
import { isSpeaking, speak, stopSpeech } from "@/lib/speech";
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
  const { volume, speakingRate, aiVoice, autoPlayAudio, textSize, updateSetting, needs } = useSettings();
  // Pengguna yang lebih nyaman mengetik tidak diberi tombol mikrofon (Alt+M tetap bisa dipakai)
  const showButton = !needs.includes("wicara");
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState("");
  const recognitionRef = useRef<any>(null);
  const lastSaid = useRef("");
  // Mode dengar terus: setelah satu perintah selesai, mikrofon menyala lagi sendiri
  const [continuous, setContinuous] = useState(false);
  const continuousRef = useRef(false);
  continuousRef.current = continuous;
  // Kotak perintah ketik, untuk browser tanpa pengenalan suara
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const movedByVoice = useRef(false);

  // Tanggapan singkat memakai suara perangkat supaya terdengar seketika
  const say = useCallback(
    (text: string) => {
      setStatus(text);
      lastSaid.current = text;
      speak(text, { volume, rate: speakingRate, aiVoice: false, feedback: true });
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

      if (/^(berhenti|stop|selesai|matikan) (mendengar|mendengarkan|dengar|mikrofon)/.test(command)) {
        setContinuous(false);
        say("Mode dengar terus dimatikan.");
        return;
      }
      if (/^(mode )?(dengar|dengarkan) terus|^terus dengarkan/.test(command)) {
        setContinuous(true);
        say("Mode dengar terus menyala. Ucapkan perintah kapan saja. Katakan berhenti mendengar untuk mematikannya.");
        return;
      }

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
        speak(lastSaid.current, { volume, rate: next, aiVoice: false, feedback: true });
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

  const restartTimer = useRef<ReturnType<typeof setTimeout>>();

  const startListening = useCallback((automatic = false) => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Tanpa pengenalan suara (browser lama, atau alamat bukan https): tawarkan kotak ketik
    if (!SpeechRecognition || !window.isSecureContext) {
      setTyping(true);
      setStatus(
        !SpeechRecognition
          ? "Browser ini belum mendukung perintah suara. Ketik perintahmu di kotak ini, atau pakai Chrome, Edge, atau Safari."
          : "Perintah suara hanya bisa dipakai lewat alamat https. Untuk sementara, ketik perintahmu di kotak ini."
      );
      return;
    }

    // Hentikan suara yang sedang diputar agar tidak ikut terdengar oleh mikrofon
    if (!automatic) stopSpeech();

    // Safari di iPhone hanya mau bersuara bila pernah diminta langsung dari
    // sentuhan pengguna; ucapan kosong ini membuka izin itu untuk jawaban nanti.
    if (!automatic && "speechSynthesis" in window) {
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
      // Saringan gema: abaikan bila yang tertangkap adalah ucapan asisten sendiri
      const heard = normalizeCommand(transcript);
      const echo = normalizeCommand(lastSaid.current);
      if (heard.length > 3 && echo.includes(heard)) return;
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
      // Dalam mode dengar terus, diam bukan kesalahan: cukup mendengarkan lagi
      if (event.error === "no-speech" && continuousRef.current) return;
      failed = true;
      if (event.error !== "no-speech") setContinuous(false);
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
      else if (!handled && !failed && !continuousRef.current) setStatus("Tidak terdengar suara. Coba lagi.");

      // Mode dengar terus: tunggu sampai asisten selesai bicara, lalu dengarkan lagi
      if (continuousRef.current && !failed) {
        const resume = () => {
          if (!continuousRef.current || recognitionRef.current) return;
          if (isSpeaking()) {
            restartTimer.current = setTimeout(resume, 300);
            return;
          }
          latestStart.current(true);
        };
        restartTimer.current = setTimeout(resume, 400);
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setStatus(continuousRef.current ? "Mendengarkan terus..." : "Mendengarkan...");
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

  const latestStart = useRef(startListening);
  latestStart.current = startListening;

  // Menyalakan mode dengar terus langsung memulai mendengarkan
  useEffect(() => {
    if (continuous && !recognitionRef.current) {
      restartTimer.current = setTimeout(() => {
        if (!isSpeaking() && !recognitionRef.current) latestStart.current(true);
      }, 4500);
    }
    if (!continuous) clearTimeout(restartTimer.current);
    return () => clearTimeout(restartTimer.current);
  }, [continuous]);

  const toggle = useCallback(() => {
    if (recognitionRef.current) {
      // Menekan tombol saat mendengarkan terus berarti mematikan mode itu
      setContinuous(false);
      recognitionRef.current.stop();
      return;
    }
    startListening();
  }, [startListening]);

  const submitTyped = (event: React.FormEvent) => {
    event.preventDefault();
    if (!typed.trim()) return;
    handleCommand(typed);
    setTyped("");
  };

  // Alt+M atau Ctrl+M memulai atau menghentikan perintah suara dari halaman mana pun
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Alt+M atau Ctrl+M
      if ((event.altKey || event.ctrlKey) && !event.metaKey && event.key.toLowerCase() === "m") {
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
      {typing && (
        <form onSubmit={submitTyped} className="flex items-center gap-1 rounded-xl bg-card border shadow-lg p-1.5" role="search" aria-label="Perintah ketik">
          <label htmlFor="typed-command" className="sr-only">
            Ketik perintah
          </label>
          <input
            id="typed-command"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setTyping(false)}
            placeholder="Contoh: buka flexa"
            autoFocus
            className="w-56 rounded-lg bg-background px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" className="rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium">
            Jalankan
          </button>
          <button type="button" onClick={() => setTyping(false)} aria-label="Tutup kotak perintah ketik" className="p-2 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      )}
      {continuous && (
        <p className="px-3 py-1 rounded-full bg-red-600 text-white text-xs font-semibold shadow" aria-hidden="true">
          Mode dengar terus
        </p>
      )}
      {/* Pengguna yang lebih nyaman mengetik mendapat tombol perintah ketik */}
      {!showButton && !typing && (
        <button
          type="button"
          onClick={() => setTyping(true)}
          aria-label="Ketik perintah, misalnya buka flexa"
          title="Ketik perintah"
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 border-white/40 text-white bg-primary hover:bg-primary/90 focus:outline-none focus-visible:ring-4 focus-visible:ring-ring"
        >
          <Keyboard className="w-6 h-6" aria-hidden="true" />
        </button>
      )}
      {showButton && (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={isListening}
        aria-label={
          isListening
            ? "Berhenti mendengarkan"
            : "Perintah suara. Tekan lalu bicara, atau tekan Alt M atau Ctrl M. Katakan bantuan untuk daftar perintah."
        }
        title="Perintah suara (Alt+M atau Ctrl+M)"
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
      )}
    </div>
  );
}
