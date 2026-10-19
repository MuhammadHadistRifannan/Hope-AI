import { useEffect, useRef, useState } from "react";
import { CheckCircle2, CircleAlert, Loader2, Mic, MicOff, RotateCcw, Sparkles, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, authHeaders } from "@/lib/api";
import { useSettings } from "@/context/SettingsContext";
import { isSpeaking } from "@/lib/speech";
import { holdVoiceAssistant, stripFinishWord } from "@/lib/voiceCommands";

// "Jelaskan dengan suaramu" (teknik Feynman): setelah membaca, siswa menjelaskan ulang
// materi dengan kata-katanya sendiri, lewat suara atau ketikan. AI membandingkannya
// dengan materi lalu memberi tahu bagian yang sudah dipahami, yang terlewat, dan yang
// keliru. Umpan baliknya langsung dibacakan, jadi siswa netra atau disleksia bisa
// belajar tanpa menulis.
//
// Tanpa sentuhan: perintah suara "jelaskan materi ini" menaikkan voiceStart, lalu
// mikrofon menyala sendiri setelah petunjuk selesai dibacakan. Siswa menutup
// penjelasannya dengan "selesai" atau "sekian", dan penjelasan langsung dinilai.

type Result = {
  skor: number;
  dipahami: string[];
  terlewat: string[];
  keliru: string[];
  umpan_balik: string;
};

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
};

const MIN_LENGTH = 20;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// Tunggu sampai aplikasi selesai bersuara supaya mikrofon tidak merekam suaranya sendiri
const waitUntilQuiet = async () => {
  await wait(600);
  while (isSpeaking()) await wait(250);
};

type Props = {
  title: string;
  material: string;
  speakText: (text: string) => void;
  // Bertambah setiap kali perintah suara meminta mulai menjelaskan
  voiceStart?: number;
};

export default function ExplainBack({ title, material, speakText, voiceStart = 0 }: Props) {
  const { needs } = useSettings();
  const typingFirst = needs.includes("wicara");
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const textRef = useRef("");
  textRef.current = text;
  // Penjelasan ditutup dengan kata "selesai": nilai begitu perekaman berhenti
  const submitOnEnd = useRef(false);
  // Dimulai lewat perintah suara: kesalahan dan petunjuk juga dibacakan
  const byVoice = useRef(false);

  const SpeechRecognition =
    typeof window !== "undefined"
      ? ((window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition })
          .SpeechRecognition ??
        (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition)
      : undefined;
  const canListen = Boolean(SpeechRecognition) && typeof window !== "undefined" && window.isSecureContext;

  useEffect(
    () => () => {
      recognitionRef.current?.stop();
      holdVoiceAssistant(false);
    },
    []
  );

  const showError = (message: string) => {
    setError(message);
    if (byVoice.current) speakText(message);
  };

  const startListening = () => {
    if (!SpeechRecognition) return;
    setError("");
    const recognition = new SpeechRecognition();
    recognition.lang = "id-ID";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let finalText = "";
      let partial = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const piece = event.results[i];
        if (piece.isFinal) finalText += piece[0].transcript;
        else partial += piece[0].transcript;
      }
      if (finalText) {
        const joined = `${textRef.current} ${finalText}`.replace(/\s+/g, " ").trimStart();
        const finished = stripFinishWord(joined);
        textRef.current = finished ?? joined;
        setText(textRef.current);
        if (finished !== null) {
          submitOnEnd.current = true;
          recognition.stop();
        }
      }
      setInterim(partial);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed") showError("Izin mikrofon ditolak. Izinkan mikrofon di browser, atau ketik penjelasanmu.");
      else if (event.error !== "no-speech" && event.error !== "aborted") showError("Suara belum terdengar jelas. Coba lagi atau ketik penjelasanmu.");
    };
    recognition.onend = () => {
      setListening(false);
      setInterim("");
      recognitionRef.current = null;
      if (submitOnEnd.current) {
        submitOnEnd.current = false;
        submit();
      } else {
        holdVoiceAssistant(false);
      }
    };
    recognitionRef.current = recognition;
    holdVoiceAssistant(true);
    try {
      recognition.start();
      setListening(true);
    } catch (cause) {
      console.error("Perekaman penjelasan gagal dimulai:", cause);
      recognitionRef.current = null;
      holdVoiceAssistant(false);
      showError("Mikrofon belum bisa dipakai. Coba lagi atau ketik penjelasanmu.");
    }
  };

  const stopListening = () => recognitionRef.current?.stop();

  const submit = async () => {
    stopListening();
    const explanation = `${textRef.current} ${interim}`.trim();
    if (explanation.length < MIN_LENGTH) {
      showError("Penjelasanmu masih terlalu singkat. Coba jelaskan dengan beberapa kalimat.");
      holdVoiceAssistant(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/gemini/explain-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ material, explanation }),
      });
      if (!response.ok) throw new Error((await response.text()) || response.statusText);
      const data: Result = await response.json();
      setResult(data);
      speakText(
        `Skormu ${data.skor}. ${data.umpan_balik}` +
          (byVoice.current ? " Katakan jelaskan lagi untuk mencoba sekali lagi." : "")
      );
      // Asisten suara baru mendengarkan lagi setelah umpan balik selesai dibacakan
      await waitUntilQuiet();
    } catch (cause) {
      console.error("Penilaian penjelasan gagal:", cause);
      showError("Penilaian belum bisa dibuat. Periksa koneksi lalu coba lagi.");
    } finally {
      setLoading(false);
      holdVoiceAssistant(false);
    }
  };

  // Perintah suara "jelaskan materi ini": baca petunjuk singkat, lalu mulai merekam
  useEffect(() => {
    if (!voiceStart) return;
    let cancelled = false;
    byVoice.current = true;
    reset();
    holdVoiceAssistant(true);
    (async () => {
      if (!canListen) {
        holdVoiceAssistant(false);
        speakText("Perekaman suara belum didukung di browser ini. Ketik penjelasanmu di kotak yang tersedia.");
        return;
      }
      await waitUntilQuiet();
      if (cancelled) return;
      speakText(`Silakan jelaskan ${title} dengan kata-katamu sendiri. Katakan selesai bila sudah.`);
      await waitUntilQuiet();
      if (!cancelled && !recognitionRef.current) startListening();
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceStart]);

  const reset = () => {
    setResult(null);
    textRef.current = "";
    setText("");
    setInterim("");
    setError("");
  };

  const scoreTone =
    result && result.skor >= 75
      ? { bar: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", label: "Pemahamanmu sudah bagus" }
      : result && result.skor >= 45
      ? { bar: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", label: "Sudah di jalur yang benar" }
      : { bar: "bg-rose-500", text: "text-rose-700 dark:text-rose-300", label: "Yuk, baca sekali lagi" };

  if (result) {
    const sections = [
      { key: "dipahami", title: "Sudah kamu pahami", items: result.dipahami, icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400" },
      { key: "terlewat", title: "Belum kamu sebut", items: result.terlewat, icon: CircleAlert, color: "text-amber-600 dark:text-amber-400" },
      { key: "keliru", title: "Perlu diluruskan", items: result.keliru, icon: XCircle, color: "text-rose-600 dark:text-rose-400" },
    ];
    return (
      <div className="space-y-5" aria-live="polite">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Pemahaman tentang "{title}"</p>
              <p className={`px-title text-xl md:text-2xl ${scoreTone.text}`}>{scoreTone.label}</p>
            </div>
            <p className={`px-title text-4xl ${scoreTone.text}`}>
              {result.skor}
              <span className="text-lg text-muted-foreground">/100</span>
            </p>
          </div>
          <div className="mt-3 h-3 rounded-full bg-muted overflow-hidden" role="img" aria-label={`Skor ${result.skor} dari 100`}>
            <div className={`h-full rounded-full ${scoreTone.bar}`} style={{ width: `${result.skor}%` }} />
          </div>
          <p className="mt-4 text-lg leading-relaxed">{result.umpan_balik}</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {sections.map((section) => (
            <section key={section.key} aria-labelledby={`hasil-${section.key}`} className="rounded-2xl border border-border p-4">
              <h4 id={`hasil-${section.key}`} className={`flex items-center gap-2 font-bold ${section.color}`}>
                <section.icon className="h-5 w-5 shrink-0" aria-hidden="true" /> {section.title}
              </h4>
              {section.items.length ? (
                <ul className="mt-2 space-y-1.5 text-base leading-snug">
                  {section.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Tidak ada.</p>
              )}
            </section>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="px-btn" onClick={() => speakText(`Skormu ${result.skor}. ${result.umpan_balik}`)}>
            <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Dengarkan umpan balik
          </Button>
          <Button className="px-btn" variant="outline" onClick={reset}>
            <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" /> Jelaskan lagi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-primary/5 border border-primary/15 p-4 md:p-5">
        <h3 className="px-title text-lg md:text-xl flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary shrink-0" aria-hidden="true" /> Jelaskan dengan suaramu
        </h3>
        <p className="mt-2 text-muted-foreground leading-relaxed">
          Sudah selesai membaca? Jelaskan ulang isi materi ini dengan kata-katamu sendiri, seperti sedang mengajari teman.
          AI akan memberi tahu bagian yang sudah kamu pahami, yang terlewat, dan yang perlu diluruskan.
        </p>
      </div>

      {canListen && !typingFirst && (
        <div className="flex flex-col items-center gap-3 text-center">
          <button
            type="button"
            onClick={listening ? stopListening : startListening}
            aria-pressed={listening}
            className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-xl transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 ${
              listening ? "bg-rose-600 animate-pulse shadow-rose-500/30" : "bg-primary shadow-primary/30 hover:bg-primary/90"
            }`}
          >
            {listening ? <MicOff className="h-10 w-10" aria-hidden="true" /> : <Mic className="h-10 w-10" aria-hidden="true" />}
            <span className="sr-only">{listening ? "Berhenti merekam penjelasan" : "Mulai jelaskan dengan suara"}</span>
          </button>
          <p className="font-semibold" role="status">
            {listening ? "Mendengarkan… ketuk lagi bila sudah selesai" : "Ketuk mikrofon, lalu mulai menjelaskan"}
          </p>
        </div>
      )}

      <div>
        <label htmlFor="penjelasan-siswa" className="text-sm font-semibold">
          {canListen && !typingFirst ? "Penjelasanmu (bisa juga diketik atau diperbaiki)" : "Ketik penjelasanmu"}
        </label>
        <Textarea
          id="penjelasan-siswa"
          value={listening && interim ? `${text} ${interim}`.trim() : text}
          onChange={(event) => setText(event.target.value)}
          readOnly={listening}
          rows={5}
          placeholder="Contoh: Materi ini menjelaskan bahwa…"
          className="mt-1.5 rounded-xl text-base"
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button size="lg" onClick={submit} disabled={loading || (`${text} ${interim}`.trim().length === 0)} className="px-btn w-full h-12 text-base">
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" /> Menilai penjelasanmu…
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" aria-hidden="true" /> Nilai penjelasanku
          </>
        )}
      </Button>
    </div>
  );
}
