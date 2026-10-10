import { useEffect, useState } from "react";
import { applyIndonesianVoice } from "@/lib/voice";
import { CheckCircle2, Loader2, Mic, RefreshCcw, Volume2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { API_URL, authHeaders } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { requestVoiceInput, useVoiceCommands } from "@/lib/voiceCommands";

type Question = {
  q: string;
  options: string[];
  a: string;
  difficulty: number;
};

// Jumlah soal yang ditanyakan per kuis; soal dipilih dari kumpulan yang dibuat AI
const QUESTIONS_PER_QUIZ = 5;

const difficultyLabel: Record<number, string> = { 1: "Mudah", 2: "Sedang", 3: "Sulit" };

// Kuis adaptif: jawaban benar menaikkan tingkat kesulitan soal berikutnya,
// jawaban salah menurunkannya.
const pickNext = (pool: Question[], used: Set<number>, level: number) => {
  let best = -1;
  pool.forEach((question, index) => {
    if (used.has(index)) return;
    if (
      best === -1 ||
      Math.abs(question.difficulty - level) < Math.abs(pool[best].difficulty - level)
    ) {
      best = index;
    }
  });
  return best;
};

type Props = {
  title: string;
  text: string;
  onClose: () => void;
};

export default function DocumentQuiz({ title, text, onClose }: Props) {
  const { volume, speakingRate, autoPlayAudio } = useSettings();

  const [pool, setPool] = useState<Question[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "playing" | "done">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [used, setUsed] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [level, setLevel] = useState(2);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);

  const total = Math.min(QUESTIONS_PER_QUIZ, pool.length);
  const current = currentIndex >= 0 ? pool[currentIndex] : null;

  const speak = (content: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    applyIndonesianVoice(utterance);
    utterance.volume = volume / 100;
    utterance.rate = speakingRate === "slow" ? 0.8 : speakingRate === "fast" ? 1.2 : 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const readQuestion = (question: Question) =>
    speak(`${question.q}. Pilihan: ${question.options.join(". ")}.`);

  const loadQuiz = async () => {
    setStatus("loading");
    setScore(0);
    setAnswered(0);
    setSelected(null);
    setLevel(2);

    try {
      const response = await fetch(`${API_URL}/gemini/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) {
        throw new Error((await response.text()) || "Kuis belum bisa dibuat.");
      }

      const data = await response.json();
      const questions: Question[] = data.questions ?? [];
      if (questions.length === 0) throw new Error("Kuis belum bisa dibuat dari teks ini.");

      const first = pickNext(questions, new Set(), 2);
      setPool(questions);
      setUsed(new Set([first]));
      setCurrentIndex(first);
      setStatus("playing");
      if (autoPlayAudio) readQuestion(questions[first]);
    } catch (error: any) {
      console.error("Gagal membuat kuis:", error);
      setErrorMessage(error?.message ?? "Kuis belum bisa dibuat.");
      setStatus("error");
    }
  };

  useEffect(() => {
    loadQuiz();
    return () => window.speechSynthesis?.cancel();
  }, []);

  const saveResult = async (finalScore: number) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("document_quiz_attempts").insert({
      user_id: user.id,
      title,
      score: finalScore,
      total,
    });
    if (error) {
      console.error("Gagal menyimpan hasil kuis:", error);
      return;
    }

    // Tiap jawaban benar bernilai 10 XP
    const { data: profile } = await supabase
      .from("profiles")
      .select("xp")
      .eq("id", user.id)
      .maybeSingle();
    if (profile) {
      await supabase
        .from("profiles")
        .update({ xp: profile.xp + finalScore * 10 })
        .eq("id", user.id);
    }
  };

  const answer = (option: string) => {
    if (!current || selected) return;
    const isCorrect = option === current.a;
    setSelected(option);
    setAnswered(answered + 1);
    if (isCorrect) setScore(score + 1);
    setLevel(isCorrect ? Math.min(3, level + 1) : Math.max(1, level - 1));
    if (autoPlayAudio) speak(isCorrect ? "Benar!" : `Kurang tepat. Jawabannya ${current.a}.`);
  };

  const next = () => {
    if (answered >= total) {
      setStatus("done");
      saveResult(score);
      return;
    }
    const nextIndex = pickNext(pool, used, level);
    setUsed(new Set([...used, nextIndex]));
    setCurrentIndex(nextIndex);
    setSelected(null);
    if (autoPlayAudio) readQuestion(pool[nextIndex]);
  };

  // Perintah suara: "A" sampai "D" (atau "satu" sampai "empat") untuk menjawab,
  // "lanjut" untuk soal berikutnya, "ulangi" untuk mendengar soal lagi
  useVoiceCommands((command) => {
    if (status !== "playing" || !current) return false;

    if (/^(ulangi|ulang|bacakan soal|baca soal)/.test(command)) {
      readQuestion(current);
      return true;
    }
    if (/^(lanjut|berikutnya|selanjutnya|lihat hasil)/.test(command)) {
      if (!selected) return false;
      next();
      return true;
    }

    const choices: Record<string, number> = {
      a: 0, satu: 0, pertama: 0,
      b: 1, be: 1, dua: 1, kedua: 1,
      c: 2, ce: 2, tiga: 2, ketiga: 2,
      d: 3, de: 3, empat: 3, keempat: 3,
    };
    const word = command.replace(/^(jawab|pilih|pilihan|jawaban)\s+/, "");
    let index = choices[word];
    // Menyebut isi pilihannya juga diterima
    if (index === undefined) {
      index = current.options.findIndex((option) => option.toLowerCase().replace(/[.,!?]/g, "") === word);
    }
    if (index === undefined || index < 0 || index >= current.options.length || selected) return false;

    answer(current.options[index]);
    return true;
  });

  if (status === "loading") {
    return (
      <div className="py-16 text-center" role="status">
        <Loader2 className="w-10 h-10 mx-auto mb-4 animate-spin text-primary" aria-hidden="true" />
        <p className="text-lg font-medium">NeoTutor sedang menyusun soal dari materi ini...</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="py-12 text-center" role="alert">
        <p className="text-lg font-medium mb-2">Kuis belum bisa dibuat</p>
        <p className="text-muted-foreground mb-6">{errorMessage}</p>
        <div className="flex justify-center gap-2">
          <Button variant="outline" onClick={onClose}>Tutup</Button>
          <Button onClick={loadQuiz}>Coba Lagi</Button>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="py-8 text-center" role="status">
        <h2 className="text-2xl font-bold mb-2">Kuis selesai!</h2>
        <p className="text-5xl font-black text-primary my-6">
          {score} / {total}
        </p>
        <p className="text-muted-foreground mb-8">
          {score === total
            ? "Sempurna! Kamu menguasai materi ini."
            : score >= total / 2
            ? "Bagus! Baca lagi bagian yang masih ragu, lalu coba soal baru."
            : "Tidak apa-apa. Dengarkan materinya sekali lagi, lalu coba lagi."}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={onClose}>Kembali ke Materi</Button>
          <Button onClick={loadQuiz}>
            <RefreshCcw className="w-4 h-4 mr-2" aria-hidden="true" /> Soal Baru
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <p className="text-sm font-medium">
          Soal {Math.min(answered + (selected ? 0 : 1), total)} dari {total}
        </p>
        <span className="text-xs px-2 py-1 rounded-full bg-muted">
          Tingkat: {difficultyLabel[current.difficulty]}
        </span>
      </div>
      <Progress value={(answered / total) * 100} className="mb-6" aria-label="Kemajuan kuis" />

      <div className="flex items-start justify-between gap-3 mb-6">
        <h2 className="text-xl md:text-2xl font-bold leading-snug">{current.q}</h2>
        <div className="flex flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => readQuestion(current)}
            aria-label="Bacakan soal dan pilihan jawaban"
          >
            <Volume2 className="w-5 h-5" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={requestVoiceInput}
            aria-label="Jawab dengan suara. Katakan A, B, C, atau D, lalu lanjut."
            title="Jawab dengan suara"
          >
            <Mic className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3" role="group" aria-label="Pilihan jawaban">
        {current.options.map((option) => {
          const isAnswer = option === current.a;
          const isChosen = option === selected;
          return (
            <Button
              key={option}
              variant="outline"
              disabled={selected !== null}
              onClick={() => answer(option)}
              className={`h-auto min-h-12 py-3 px-4 justify-start text-left text-base whitespace-normal disabled:opacity-100 ${
                selected && isAnswer
                  ? "border-green-600 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100"
                  : isChosen
                  ? "border-red-600 bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"
                  : ""
              }`}
            >
              {selected && isAnswer && <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />}
              {isChosen && !isAnswer && <XCircle className="w-5 h-5 mr-2 flex-shrink-0" aria-hidden="true" />}
              {option}
            </Button>
          );
        })}
      </div>

      <div className="mt-6 min-h-[5rem]" aria-live="polite">
        {selected && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-medium">
              {selected === current.a ? "Benar! 🎉" : `Kurang tepat. Jawabannya: ${current.a}`}
            </p>
            <Button onClick={next}>{answered >= total ? "Lihat Hasil" : "Soal Berikutnya"}</Button>
          </div>
        )}
      </div>
    </div>
  );
}
