import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Delete, Eraser, Hand, LayoutGrid, Play, SkipForward, Sun, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BisindoDictionary, { BisindoCredit } from "@/components/BisindoDictionary";
import { matchesTarget, type RawFrame, type WordModel, type WordPrediction } from "@/lib/sign/bisindo";
import { BISINDO_GROUPS, BISINDO_WORDS, bisindoVideo, bisindoWord, differenceBetween, type BisindoGroup } from "@/lib/sign/bisindoWords";

export const WORD_MIN_CONFIDENCE = 0.45;
const NEXT_WORD_DELAY_MS = 3000;

// Satu isyarat yang selesai diperagakan (tangan sudah diturunkan)
export type SignResult = { id: number; prediction: WordPrediction | null; frames: RawFrame[] };

type Props = {
  mode: string;
  onModeChange: (mode: string) => void;
  model: WordModel | null;
  modelChecked: boolean;
  cameraOn: boolean;
  result: SignResult | null;
  onTargetChange: (word: string | null) => void;
  say: (text: string) => void;
  speak: (text: string) => void;
};

const PRAISES = ["Hebat! Isyaratmu jelas.", "Luar biasa, tepat sekali!", "Mantap! Terus berlatih, ya.", "Keren, gerakanmu pas!"];
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export default function BisindoPanel({
  mode, onModeChange, model, modelChecked, cameraOn, result, onTargetChange, say, speak,
}: Props) {
  const words = useMemo(() => (model ? BISINDO_WORDS.map((w) => w.label).filter((l) => model.labels.includes(l)) : []), [model]);

  // Latihan: kata diambil dari kelompok yang dipilih
  const [group, setGroup] = useState<BisindoGroup | "Semua">("Semua");
  const groupOf = (label: string) => bisindoWord(label)?.group;
  const pool = useMemo(() => (group === "Semua" ? words : words.filter((w) => groupOf(w) === group)), [words, group]);
  const [target, setTarget] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [solved, setSolved] = useState(0);
  const nextTimer = useRef<ReturnType<typeof setTimeout>>();

  // Isyarat ke Suara
  const [sentence, setSentence] = useState<string[]>([]);


  useEffect(() => () => clearTimeout(nextTimer.current), []);
  useEffect(() => onTargetChange(mode === "latihan" && !success ? target : null), [mode, target, success, onTargetChange]);

  const startWord = (word?: string) => {
    clearTimeout(nextTimer.current);
    setSuccess(null);
    setHint("");
    const choices = pool.length > 1 ? pool.filter((w) => w !== target) : pool;
    const next = word ?? (choices.length ? pick(choices) : null);
    setTarget(next);
    if (next) say(`Peragakan ${next.toLowerCase()}.`);
  };

  const practiceWord = (word: string) => {
    onModeChange("latihan");
    startWord(word);
  };

  // Tiap isyarat yang selesai diproses sekali sesuai tab yang aktif
  const handled = useRef(0);
  useEffect(() => {
    if (!result || result.id === handled.current) return;
    handled.current = result.id;
    const guess = result.prediction;
    const confident = guess !== null && guess.confidence >= WORD_MIN_CONFIDENCE;

    if (mode === "eja") {
      if (!confident) return;
      setSentence((all) => [...all, guess!.label]);
      say(guess!.label.toLowerCase());
      return;
    }

    if (mode !== "latihan" || !target || success) return;
    if (matchesTarget(guess, target)) {
      const praise = pick(PRAISES);
      setHint("");
      setSuccess(praise);
      setSolved((n) => n + 1);
      say(`${target.toLowerCase()}! ${praise}`);
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      nextTimer.current = setTimeout(() => startWord(), NEXT_WORD_DELAY_MS);
    } else if (confident) {
      // Untuk pasangan yang mirip menurut audit, jelaskan bedanya
      const difference = differenceBetween(guess!.label, target);
      setHint(`Terbaca "${guess!.label}". ${difference ?? `Coba lagi isyarat "${target}".`}`);
    } else {
      setHint("Belum yakin. Ulangi gerakannya lebih jelas, lalu turunkan tangan.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const targetWord = target ? bisindoWord(target) : undefined;

  return (
    <Tabs value={mode} onValueChange={onModeChange}>
      <TabsList className="px-tabs mb-6 flex w-full flex-wrap justify-start">
        <TabsTrigger value="latihan" className="px-tab flex-1">Latihan</TabsTrigger>
        <TabsTrigger value="eja" className="px-tab flex-1">Isyarat ke Suara</TabsTrigger>
        <TabsTrigger value="kamus" className="px-tab flex-1">Kamus</TabsTrigger>
      </TabsList>

      {modelChecked && !model && mode !== "kamus" && (
        <div className="px-well p-4" role="status">
          <p className="font-medium mb-1">Pengenal kata belum tersedia</p>
          <p className="text-sm text-muted-foreground">
            Model kata BISINDO belum terpasang. Kamus tetap bisa dibuka.
          </p>
        </div>
      )}

      <TabsContent value="latihan">
        {model && !target && (
          <div className="py-2">
            <div className="text-center">
              <p className="px-title text-2xl md:text-3xl">Latihan kata BISINDO</p>
              <p className="text-muted-foreground text-base md:text-lg mt-2 max-w-md mx-auto">
                Akan muncul satu kata beserta video contohnya. Peragakan isyaratnya, lalu turunkan tangan supaya gerakanmu dibaca.
              </p>
            </div>

            {/* Pilih kelompok kata yang ingin dilatih */}
            <div className="mt-6" role="group" aria-label="Kelompok kata yang dilatih">
              <p className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-2">
                <LayoutGrid className="w-4 h-4" aria-hidden="true" /> Pilih kelompok kata
              </p>
              <div className="flex flex-wrap gap-2">
                {(["Semua", ...BISINDO_GROUPS] as const).map((option) => {
                  const count = option === "Semua" ? words.length : words.filter((w) => groupOf(w) === option).length;
                  if (count === 0) return null;
                  const active = group === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setGroup(option)}
                      aria-pressed={active}
                      className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/50 hover:bg-primary/5"
                      }`}
                    >
                      {option}
                      <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-white/20" : "bg-muted text-muted-foreground"}`}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 text-center">
              <Button size="lg" onClick={() => startWord()} disabled={pool.length === 0} className="px-btn h-14 px-10 text-lg">
                <Play className="w-5 h-5 mr-2" aria-hidden="true" /> Mulai Berlatih
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                {group === "Semua" ? `${pool.length} kata siap dilatih` : `${pool.length} kata dari kelompok ${group}`}
                {!cameraOn && " · nyalakan kamera di sebelah kiri"}
              </p>
            </div>
            {/* Tips supaya kamera bisa membaca gerakan */}
            <ul className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Tips sebelum mulai">
              {[
                { icon: UserRound, title: "Badan terlihat", text: "Kepala, bahu, dan kedua tangan masuk kamera." },
                { icon: Sun, title: "Cahaya cukup", text: "Hadap ke sumber cahaya, jangan membelakangi jendela." },
                { icon: Hand, title: "Turunkan tangan", text: "Setelah satu kata, turunkan tangan supaya dibaca." },
              ].map((tip) => (
                <li key={tip.title} className="rounded-2xl border border-border bg-muted/40 p-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" aria-hidden="true">
                    <tip.icon className="h-5 w-5" />
                  </span>
                  <p className="mt-3 font-semibold">{tip.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground leading-snug">{tip.text}</p>
                </li>
              ))}
            </ul>

          </div>
        )}

        {model && target && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Peragakan kata ini</p>
            <p className="px-title text-3xl mb-3">{target}</p>
            <p className="font-medium min-h-[1.5rem]" aria-live="polite">
              {success ? `Berhasil! ${success}` : ""}
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300 min-h-[1.25rem]" aria-live="polite">
              {hint}
            </p>
            {!cameraOn && <p className="text-sm text-muted-foreground mt-1">Nyalakan kamera untuk mulai.</p>}

            {targetWord && (
              <figure className="mt-3">
                <video
                  key={targetWord.slug}
                  src={bisindoVideo(targetWord)}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full max-w-xs aspect-[4/3] object-contain mx-auto rounded-xl border border-border bg-black"
                  aria-label={`Contoh isyarat ${targetWord.label}`}
                />
                <figcaption className="text-sm text-muted-foreground mt-2">{targetWord.movement || "Ikuti gerakan di video contoh."}</figcaption>
              </figure>
            )}
            {targetWord && <BisindoCredit source={targetWord.source} className="mt-2" />}

            <div className="flex flex-wrap justify-center gap-2 mt-5">
              <Button className="px-btn" variant="outline" onClick={() => say(target.toLowerCase())}>
                <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Dengarkan Kata
              </Button>
              <Button className="px-btn" variant="outline" onClick={() => startWord()}>
                <SkipForward className="w-4 h-4 mr-2" aria-hidden="true" /> Ganti Kata
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Kata berhasil diperagakan: {solved} · Kelompok: {group}{" "}
              <button
                type="button"
                onClick={() => {
                  clearTimeout(nextTimer.current);
                  setTarget(null);
                  setSuccess(null);
                  setHint("");
                }}
                className="font-semibold text-primary underline underline-offset-4 min-h-11 px-1"
              >
                Ganti kelompok
              </button>
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="eja">
        {model && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Peragakan kata satu per satu dan turunkan tangan setelah tiap kata. Kata yang terbaca masuk ke bawah dan
              diucapkan.
            </p>
            <div className="px-well min-h-[6rem] p-4 text-2xl font-bold break-words mb-4" aria-live="polite" aria-label="Kalimat">
              {sentence.length ? sentence.join(" ") : <span className="text-muted-foreground font-normal text-lg">Belum ada kata</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="px-btn" onClick={() => speak(sentence.join(" ").toLowerCase())} disabled={!sentence.length}>
                <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Ucapkan
              </Button>
              <Button className="px-btn" variant="outline" onClick={() => setSentence((all) => all.slice(0, -1))} disabled={!sentence.length}>
                <Delete className="w-4 h-4 mr-2" aria-hidden="true" /> Hapus Kata
              </Button>
              <Button className="px-btn" variant="outline" onClick={() => setSentence([])} disabled={!sentence.length}>
                <Eraser className="w-4 h-4 mr-2" aria-hidden="true" /> Bersihkan
              </Button>
            </div>
          </div>
        )}
      </TabsContent>

      <TabsContent value="kamus">
        <BisindoDictionary practicable={new Set(model?.labels ?? [])} onPractice={practiceWord} onSpeak={speak} />
      </TabsContent>

    </Tabs>
  );
}
