import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Delete, Download, Eraser, Pause, Play, SkipForward, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BisindoDictionary, { BisindoCredit } from "@/components/BisindoDictionary";
import type { RawFrame, WordModel, WordPrediction } from "@/lib/sign/bisindo";
import { BISINDO_WORDS, bisindoVideo, bisindoWord, differenceBetween } from "@/lib/sign/bisindoWords";

export const WORD_MIN_CONFIDENCE = 0.6;
const NEXT_WORD_DELAY_MS = 3000;

// Satu isyarat yang selesai diperagakan (tangan sudah diturunkan)
export type SignResult = { id: number; prediction: WordPrediction | null; frames: RawFrame[] };

type Props = {
  mode: string;
  onModeChange: (mode: string) => void;
  model: WordModel | null;
  modelChecked: boolean;
  cameraOn: boolean;
  trackingReady: boolean;
  result: SignResult | null;
  isStaff: boolean;
  onTargetChange: (word: string | null) => void;
  say: (text: string) => void;
  speak: (text: string) => void;
};

type Clip = { label: string; signer: string; frames: RawFrame[] };

const PRAISES = ["Hebat! Isyaratmu jelas.", "Luar biasa, tepat sekali!", "Mantap! Terus berlatih, ya.", "Keren, gerakanmu pas!"];
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
const round = (v: number) => Math.round(v * 100) / 100;

export default function BisindoPanel({
  mode, onModeChange, model, modelChecked, cameraOn, trackingReady, result, isStaff, onTargetChange, say, speak,
}: Props) {
  const words = useMemo(() => (model ? BISINDO_WORDS.map((w) => w.label).filter((l) => model.labels.includes(l)) : []), [model]);

  // Latihan
  const [target, setTarget] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [solved, setSolved] = useState(0);
  const nextTimer = useRef<ReturnType<typeof setTimeout>>();

  // Isyarat ke Suara
  const [sentence, setSentence] = useState<string[]>([]);

  // Rekam Data
  const [signer, setSigner] = useState("");
  const [recordLabel, setRecordLabel] = useState(BISINDO_WORDS[0].label);
  const [customLabel, setCustomLabel] = useState("");
  const [recording, setRecording] = useState(false);
  const [clips, setClips] = useState<Clip[]>([]);

  useEffect(() => () => clearTimeout(nextTimer.current), []);
  useEffect(() => onTargetChange(mode === "latihan" && !success ? target : null), [mode, target, success, onTargetChange]);

  const startWord = (word?: string) => {
    clearTimeout(nextTimer.current);
    setSuccess(null);
    setHint("");
    const pool = words.length > 1 ? words.filter((w) => w !== target) : words;
    const next = word ?? (pool.length ? pick(pool) : null);
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

    if (mode === "rekam") {
      if (!recording) return;
      const label = (customLabel.trim() || recordLabel).replace(/\s+/g, " ");
      const name = signer.trim().replace(/[\s,]+/g, "-") || "tanpa-nama";
      setClips((all) => [...all, { label, signer: name, frames: result.frames }]);
      return;
    }

    if (mode === "eja") {
      if (!confident) return;
      setSentence((all) => [...all, guess!.label]);
      say(guess!.label.toLowerCase());
      return;
    }

    if (mode !== "latihan" || !target || success) return;
    if (confident && guess!.label === target) {
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

  const downloadClips = () => {
    const data = {
      format: "hopeai-bisindo-rekaman",
      version: 1,
      clips: clips.map((clip) => ({
        ...clip,
        frames: clip.frames.map((f) => ({
          t: round(f.t),
          hands: f.hands.map((h) => h.map((p) => ({ x: round(p.x), y: round(p.y), z: round(p.z) }))),
          pose: f.pose.map((p) => ({ x: round(p.x), y: round(p.y), z: round(p.z) })),
        })),
      })),
    };
    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rekaman_bisindo_${(signer.trim() || "tanpa-nama").replace(/\s+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const targetWord = target ? bisindoWord(target) : undefined;
  const perLabel = clips.reduce<Record<string, number>>((count, clip) => {
    count[clip.label] = (count[clip.label] ?? 0) + 1;
    return count;
  }, {});
  const activeRecordLabel = customLabel.trim() || recordLabel;

  return (
    <Tabs value={mode} onValueChange={onModeChange}>
      <TabsList className="px-tabs mb-6 flex w-full flex-wrap justify-start">
        <TabsTrigger value="latihan" className="px-tab flex-1">Latihan</TabsTrigger>
        <TabsTrigger value="eja" className="px-tab flex-1">Isyarat ke Suara</TabsTrigger>
        <TabsTrigger value="kamus" className="px-tab flex-1">Kamus</TabsTrigger>
        {isStaff && <TabsTrigger value="rekam" className="px-tab flex-1">Rekam Data</TabsTrigger>}
      </TabsList>

      {modelChecked && !model && mode !== "rekam" && mode !== "kamus" && (
        <div className="px-well p-4" role="status">
          <p className="font-medium mb-1">Pengenal kata belum tersedia</p>
          <p className="text-sm text-muted-foreground">
            Model kata BISINDO belum terpasang. Kamus tetap bisa dibuka.
          </p>
        </div>
      )}

      <TabsContent value="latihan">
        {model && !target && (
          <div className="text-center py-6">
            <p className="text-lg font-medium mb-2">Latihan kata dasar BISINDO</p>
            <p className="text-muted-foreground mb-6">
              Akan muncul satu kata beserta videonya. Peragakan isyaratnya di depan kamera dengan badan dan bahu
              terlihat, lalu turunkan tangan. Setelah tangan turun, gerakanmu dibaca.
            </p>
            <Button size="lg" onClick={() => startWord()} className="px-btn">
              <Play className="w-5 h-5 mr-2" aria-hidden="true" /> Mulai Berlatih
            </Button>
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
                <figcaption className="text-sm text-muted-foreground mt-2">{targetWord.movement}</figcaption>
              </figure>
            )}
            {targetWord && <BisindoCredit className="mt-2" />}

            <div className="flex flex-wrap justify-center gap-2 mt-5">
              <Button className="px-btn" variant="outline" onClick={() => say(target.toLowerCase())}>
                <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Dengarkan Kata
              </Button>
              <Button className="px-btn" variant="outline" onClick={() => startWord()}>
                <SkipForward className="w-4 h-4 mr-2" aria-hidden="true" /> Ganti Kata
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Kata berhasil diperagakan: {solved}</p>
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

      {isStaff && (
        <TabsContent value="rekam">
          <p className="text-sm text-muted-foreground mb-4">
            Merekam contoh kata BISINDO untuk melatih ulang model dengan <code className="mx-1">ml/bisindo/train.py</code>.
            Yang disimpan hanya posisi titik tangan dan tubuh, bukan gambar. Selama perekaman aktif, setiap isyarat yang
            selesai (tangan diturunkan) tersimpan sebagai satu contoh. Rekam sekitar 30 contoh per kata dari beberapa
            orang.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bisindo-signer">Nama peraga</Label>
              <Input
                id="bisindo-signer"
                className="h-11 rounded-xl border border-border bg-card"
                value={signer}
                onChange={(e) => setSigner(e.target.value)}
                placeholder="Contoh: peraga-1"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Kata yang direkam</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1" role="group" aria-label="Pilih kata">
                {BISINDO_WORDS.map((word) => (
                  <Button
                    key={word.slug}
                    size="sm"
                    variant={!customLabel.trim() && word.label === recordLabel ? "default" : "outline"}
                    aria-pressed={!customLabel.trim() && word.label === recordLabel}
                    onClick={() => {
                      setCustomLabel("");
                      setRecordLabel(word.label);
                    }}
                    className="px-btn relative"
                  >
                    {word.label}
                    {perLabel[word.label] ? (
                      <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none px-1 py-0.5 border border-foreground bg-emerald-600 text-white">
                        {perLabel[word.label]}
                      </span>
                    ) : null}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bisindo-custom">Atau kata baru</Label>
              <Input
                id="bisindo-custom"
                className="h-11 rounded-xl border border-border bg-card"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Contoh: Nama, Umur, Hobi"
              />
              {customLabel.trim() && (
                <p className="text-sm text-muted-foreground">
                  Contoh "{customLabel.trim()}": {perLabel[customLabel.trim()] ?? 0}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button className="px-btn" onClick={() => setRecording((on) => !on)} disabled={!trackingReady}>
                {recording ? <Pause className="w-4 h-4 mr-2" aria-hidden="true" /> : <Play className="w-4 h-4 mr-2" aria-hidden="true" />}
                {recording ? "Jeda Perekaman" : `Mulai Rekam "${activeRecordLabel}"`}
              </Button>
              <Button className="px-btn" variant="outline" onClick={() => setClips((all) => all.slice(0, -1))} disabled={!clips.length}>
                <Delete className="w-4 h-4 mr-2" aria-hidden="true" /> Hapus Contoh Terakhir
              </Button>
              <Button className="px-btn" variant="outline" onClick={downloadClips} disabled={!clips.length}>
                <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Unduh JSON ({clips.length} contoh)
              </Button>
            </div>
            <p className="text-sm font-medium" aria-live="polite">
              {!trackingReady
                ? "Nyalakan kamera untuk mulai merekam."
                : recording
                ? `Merekam "${activeRecordLabel}". Peragakan, lalu turunkan tangan.`
                : "Perekaman dijeda."}
            </p>
          </div>
        </TabsContent>
      )}
    </Tabs>
  );
}
