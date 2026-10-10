import { useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, CameraOff, Delete, Download, Eraser, Hand, Play, SkipForward, Space, Volume2,
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { useRoles } from "@/hooks/use-roles";
import { useHandTracking, type HandFrame } from "@/hooks/use-hand-tracking";
import { toFeatures, toPixels } from "@/lib/sign/landmarks";
import { loadSignModel, predict, type Prediction, type SignModel } from "@/lib/sign/classifier";
import { Stabilizer, type StabilizerState } from "@/lib/sign/stabilizer";
import { speak, stopSpeech } from "@/lib/speech";
import SignCredit from "@/components/SignCredit";
import SignDictionary from "@/components/SignDictionary";
import { useSearchParams } from "react-router-dom";

const MODEL_URL = "/models/sibi-abjad.json";
const MIN_CONFIDENCE = 0.7;
const RECORD_MS = 3000;
// Jeda antar sampel saat merekam, agar satu rekaman tidak berisi frame yang nyaris sama
const RECORD_INTERVAL_MS = 100;
const NEXT_WORD_DELAY_MS = 4000;

// Huruf yang bisa direkam: abjad tanpa J dan Z (isyarat bergerak), ditambah angka
const RECORDABLE = [..."ABCDEFGHIKLMNOPQRSTUVWXY", ..."0123456789"];

// Kata latihan: pendek dan akrab. Kata yang memakai huruf di luar model disaring otomatis.
const PRACTICE_WORDS = [
  "IBU", "AYAH", "ADIK", "KAKAK", "BUKU", "MATA", "KAKI", "TANGAN", "RUMAH", "SAPI", "IKAN",
  "BOLA", "KUDA", "PENA", "TOPI", "ROTI", "SUSU", "GIGI", "NASI", "KUE", "API", "AIR", "PADI",
  "KOTA", "DESA", "LAUT", "BULAN", "BINTANG", "PAGI", "MALAM", "SIANG", "GURU", "KELAS", "PINTU",
  "KURSI", "TAS", "APEL", "BUAH", "SAYUR", "TEMAN", "MUSIK", "KUCING", "BURUNG", "DAUN", "AWAN",
  "PELANGI", "SEKOLAH", "MERAH", "BIRU", "HIJAU", "PUTIH",
];

const PRAISES = [
  "Hebat! Isyaratmu jelas sekali.",
  "Luar biasa, kamu berhasil!",
  "Mantap! Terus berlatih, ya.",
  "Keren! Jarimu makin lancar.",
  "Bagus sekali, semua huruf tepat!",
];

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

type Reference = { title: string; image: string; description: string };
type Practice = { word: string; index: number };
type LiveGuess = { prediction: Prediction | null; state: StabilizerState; progress: number; hasHand: boolean };

// Garis antar titik tangan untuk digambar di atas video
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11],
  [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

const CSV_HEADER = ["label", "source", "group", ...Array.from({ length: 21 }, (_, i) => [`x${i}`, `y${i}`, `z${i}`]).flat()];

export default function SignLanguage() {
  const { volume, speakingRate, aiVoice } = useSettings();
  const { isStaff } = useRoles();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stabilizer = useRef(new Stabilizer({ minConfidence: MIN_CONFIDENCE, holdMs: 700, releaseMs: 350 }));

  // ?tab=kamus membuka langsung tab Kamus (dipakai tautan dari Flexa dan perintah suara)
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [mode, setMode] = useState(() =>
    ["latihan", "eja", "kamus", "rekam"].includes(tabFromUrl ?? "") ? tabFromUrl! : "latihan"
  );
  useEffect(() => {
    if (tabFromUrl && ["latihan", "eja", "kamus", "rekam"].includes(tabFromUrl)) setMode(tabFromUrl);
  }, [tabFromUrl]);
  const [cameraOn, setCameraOn] = useState(false);
  const [model, setModel] = useState<SignModel | null>(null);
  const [modelChecked, setModelChecked] = useState(false);
  const [references, setReferences] = useState<Record<string, Reference>>({});

  // Tebakan langsung untuk ditampilkan di atas video; diperbarui beberapa kali per detik
  const [live, setLive] = useState<LiveGuess>({ prediction: null, state: "idle", progress: 0, hasHand: false });
  const lastUiUpdate = useRef(0);

  // Mode Latihan
  const [practice, setPractice] = useState<Practice | null>(null);
  const [wrongHint, setWrongHint] = useState("");
  const [solvedCount, setSolvedCount] = useState(0);
  const [celebration, setCelebration] = useState<{ word: string; praise: string } | null>(null);
  const nextWordTimer = useRef<ReturnType<typeof setTimeout>>();

  // Mode Eja ke Suara
  const [spelled, setSpelled] = useState("");

  // Mode Rekam Data (guru dan admin)
  const [signer, setSigner] = useState("");
  const [recordLabel, setRecordLabel] = useState("A");
  const [rows, setRows] = useState<string[][]>([]);
  const [recordingUntil, setRecordingUntil] = useState(0);
  const recordingBuffer = useRef<string[][]>([]);
  const lastSampleAt = useRef(0);

  // Kata yang hurufnya semua dikenali model dan tidak punya huruf kembar berurutan
  const words = useMemo(() => {
    if (!model) return [];
    const known = new Set(model.labels);
    const usable = PRACTICE_WORDS.filter(
      (word) => [...word].every((letter) => known.has(letter)) && !/(.)\1/.test(word)
    );
    // Bila model juga mengenal angka, latihan bisa berupa angka acak
    const digits = model.labels.filter((label) => /^\d$/.test(label));
    if (digits.length >= 3) {
      for (let i = 0; i < 8; i++) {
        const first = pick(digits);
        const second = pick(digits.filter((d) => d !== first));
        usable.push(Math.random() < 0.5 ? first : first + second);
      }
    }
    return usable;
  }, [model]);

  // Nilai terbaru untuk dipakai di dalam callback kamera
  const latest = useRef({ mode, practice, words, celebration });
  latest.current = { mode, practice, words, celebration };

  useEffect(() => {
    loadSignModel(MODEL_URL).then((loaded) => {
      setModel(loaded);
      setModelChecked(true);
    });

    supabase
      .from("sign_items")
      .select("slug, title, description, image_url, category")
      .in("category", ["abjad", "angka"])
      .then(({ data }) => {
        const map: Record<string, Reference> = {};
        for (const row of data ?? []) {
          map[row.slug.toUpperCase()] = {
            title: row.title,
            image: row.image_url ?? "",
            description: row.description,
          };
        }
        setReferences(map);
      });

    return () => {
      stopSpeech();
      clearTimeout(nextWordTimer.current);
    };
  }, []);

  const say = (text: string) => speak(text, { volume, rate: speakingRate, aiVoice: false });

  const drawHand = (frame: HandFrame) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    if (canvas.width !== video.videoWidth) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!frame) return;

    context.strokeStyle = "#00BFFF";
    context.fillStyle = "#FFFFFF";
    context.lineWidth = 3;
    for (const [a, b] of BONES) {
      context.beginPath();
      context.moveTo(frame.landmarks[a].x * canvas.width, frame.landmarks[a].y * canvas.height);
      context.lineTo(frame.landmarks[b].x * canvas.width, frame.landmarks[b].y * canvas.height);
      context.stroke();
    }
    for (const point of frame.landmarks) {
      context.beginPath();
      context.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
      context.fill();
    }
  };

  // --- Latihan ---
  const nextWord = () => {
    clearTimeout(nextWordTimer.current);
    setCelebration(null);
    setWrongHint("");
    stabilizer.current.reset();
    const pool = latest.current.words;
    if (pool.length === 0) return;
    const current = latest.current.practice?.word;
    const word = pick(pool.length > 1 ? pool.filter((w) => w !== current) : pool);
    setPractice({ word, index: 0 });
    say(`Eja kata ${word.toLowerCase()}. Huruf pertama, ${word[0]}.`);
  };

  // Dari kamus: latihan satu huruf atau angka tertentu
  const practiceSign = (sign: string) => {
    clearTimeout(nextWordTimer.current);
    setCelebration(null);
    setWrongHint("");
    stabilizer.current.reset();
    setMode("latihan");
    setPractice({ word: sign, index: 0 });
    say(`Peragakan ${sign}.`);
  };

  const finishWord = (word: string) => {
    const praise = pick(PRAISES);
    setSolvedCount((count) => count + 1);
    setCelebration({ word, praise });
    say(word.length === 1 ? `${word}! ${praise}` : `${word[word.length - 1]}. ${word.toLowerCase()}! ${praise}`);
    confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    nextWordTimer.current = setTimeout(nextWord, NEXT_WORD_DELAY_MS);
  };

  const handleAccepted = (label: string) => {
    const { mode: currentMode, practice: current, celebration: showing } = latest.current;

    if (currentMode === "eja") {
      setSpelled((text) => text + label);
      say(label);
      return;
    }
    if (currentMode !== "latihan" || !current || showing) return;

    const expected = current.word[current.index];
    if (label !== expected) {
      setWrongHint(`Terbaca ${label}. Coba huruf ${expected}.`);
      return;
    }

    setWrongHint("");
    const index = current.index + 1;
    setPractice({ ...current, index });
    if (index >= current.word.length) finishWord(current.word);
    else say(label);
  };

  // --- Rekam Data: baris CSV dengan kolom yang sama seperti di notebook ---
  const recordFrame = (frame: HandFrame, now: number) => {
    if (!frame || now - lastSampleAt.current < RECORD_INTERVAL_MS) return;
    lastSampleAt.current = now;
    const pixels = toPixels(frame.landmarks, frame.width, frame.height);
    recordingBuffer.current.push([
      recordLabel,
      "rekaman",
      signer.trim().replace(/[\s,]+/g, "-") || "tanpa-nama",
      ...pixels.flatMap((p) => [p.x, p.y, p.z].map((v) => v.toFixed(3))),
    ]);
  };

  const onFrame = (frame: HandFrame, now: number) => {
    drawHand(frame);

    if (recordingUntil > 0) {
      recordFrame(frame, now);
      if (now >= recordingUntil) finishRecording();
      return;
    }

    const features = frame && model ? toFeatures(frame.landmarks, frame.width, frame.height) : null;
    const prediction = features && model ? predict(model, features) : null;

    const accepted = stabilizer.current.push(prediction?.label ?? null, prediction?.confidence ?? 0, now);
    if (accepted) handleAccepted(accepted);

    if (now - lastUiUpdate.current > 120 || accepted) {
      lastUiUpdate.current = now;
      setLive({
        prediction,
        state: stabilizer.current.state,
        progress: stabilizer.current.progress,
        hasHand: frame !== null,
      });
    }
  };

  const { status, error } = useHandTracking(videoRef, cameraOn, onFrame);

  const startRecording = () => {
    recordingBuffer.current = [];
    lastSampleAt.current = 0;
    setRecordingUntil(performance.now() + RECORD_MS);
  };

  const finishRecording = () => {
    const recorded = recordingBuffer.current;
    recordingBuffer.current = [];
    setRecordingUntil(0);
    if (recorded.length < 5) return; // tangan hampir tidak terlihat
    setRows((all) => [...all, ...recorded]);
    setRecordLabel((current) => RECORDABLE[(RECORDABLE.indexOf(current) + 1) % RECORDABLE.length]);
  };

  const downloadRows = () => {
    const csv = [CSV_HEADER, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rekaman_${(signer.trim() || "tanpa-nama").replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const changeMode = (next: string) => {
    setMode(next);
    stabilizer.current.reset();
    stopSpeech();
  };

  const isRecording = recordingUntil > 0;
  const modelMissing = modelChecked && !model;
  const target = practice && !celebration ? practice.word[practice.index] : null;
  const reference = target ? references[target] : undefined;
  const recordedPerLabel = rows.reduce<Record<string, number>>((count, row) => {
    count[row[0]] = (count[row[0]] ?? 0) + 1;
    return count;
  }, {});

  const guess = live.prediction;
  const confident = guess !== null && guess.confidence >= MIN_CONFIDENCE;

  return (
    <div className="min-h-screen p-2 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Isyarat</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Lihat contoh abjad dan angka SIBI di tab Kamus, lalu tirukan di depan kamera. Kamera
            mengenali huruf yang kamu peragakan dan membacakannya.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kamera dan hasil pengenalan */}
          <Card className="p-3 md:p-6">
            <div className="relative aspect-[3/4] sm:aspect-[4/3] rounded-xl overflow-hidden bg-black">
              {/* Ditampilkan seperti cermin agar gerakan terasa wajar */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                aria-label="Pratinjau kamera"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover -scale-x-100"
                aria-hidden="true"
              />

              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/90 gap-3">
                  <Hand className="w-12 h-12" aria-hidden="true" />
                  <p>Kamera belum menyala</p>
                </div>
              )}

              {/* Huruf yang terbaca, ditampilkan langsung di atas video */}
              {cameraOn && status === "ready" && model && mode !== "rekam" && (
                <div className="absolute top-3 left-3 rounded-2xl bg-black/70 text-white px-4 py-3 min-w-[7.5rem]" aria-hidden="true">
                  {!live.hasHand ? (
                    <p className="text-sm">Tangan belum terlihat</p>
                  ) : confident ? (
                    <>
                      <p className="text-6xl font-black leading-none">{guess!.label}</p>
                      <p className="text-sm mt-1">Yakin {Math.round(guess!.confidence * 100)}%</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-bold leading-tight">Belum yakin</p>
                      {guess && (
                        <p className="text-sm text-white/80">
                          Mirip {guess.label} ({Math.round(guess.confidence * 100)}%)
                        </p>
                      )}
                    </>
                  )}
                  {live.hasHand && (
                    <div className="mt-2 h-1.5 rounded-full bg-white/25 overflow-hidden">
                      <div className="h-full bg-green-400 transition-all" style={{ width: `${live.progress * 100}%` }} />
                    </div>
                  )}
                </div>
              )}

              {target && mode === "latihan" && cameraOn && (
                <div className="absolute top-3 right-3 rounded-2xl bg-primary text-primary-foreground px-4 py-3 text-center" aria-hidden="true">
                  <p className="text-xs">Peragakan</p>
                  <p className="text-5xl font-black leading-none">{target}</p>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-red-600 text-white text-sm font-medium">
                  Merekam {recordLabel}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button onClick={() => setCameraOn((on) => !on)} variant={cameraOn ? "outline" : "default"}>
                {cameraOn ? (
                  <CameraOff className="w-4 h-4 mr-2" aria-hidden="true" />
                ) : (
                  <Camera className="w-4 h-4 mr-2" aria-hidden="true" />
                )}
                {cameraOn ? "Matikan Kamera" : "Nyalakan Kamera"}
              </Button>
              <p className="text-sm text-muted-foreground">
                Gambar kamera diproses di perangkatmu dan tidak dikirim ke server.
              </p>
            </div>

            {/* Versi teks dari hasil pengenalan, untuk pembaca layar */}
            <div className="mt-4 min-h-[2rem]" role="status" aria-live="polite">
              {status === "loading" && <p>Menyiapkan kamera dan pelacak tangan...</p>}
              {status === "error" && <p className="text-destructive font-medium">{error}</p>}
              {status === "ready" && mode === "rekam" && (
                <p className="font-medium">
                  {isRecording ? "Tahan bentuk tangan dan gerakkan sedikit..." : "Siap merekam"}
                </p>
              )}
              {status === "ready" && mode !== "rekam" && model && (
                <p className="text-sm text-muted-foreground">
                  {live.state === "accepted" && guess ? `Terbaca huruf ${guess.label}` : ""}
                </p>
              )}
            </div>
          </Card>

          {/* Mode */}
          <Card className="p-3 md:p-6">
            <Tabs value={mode} onValueChange={changeMode}>
              <TabsList className="mb-6 h-auto flex-wrap">
                <TabsTrigger value="latihan">Latihan</TabsTrigger>
                <TabsTrigger value="eja">Eja ke Suara</TabsTrigger>
                <TabsTrigger value="kamus">Kamus</TabsTrigger>
                {isStaff && <TabsTrigger value="rekam">Rekam Data</TabsTrigger>}
              </TabsList>

              {modelMissing && mode !== "rekam" && mode !== "kamus" && (
                <div className="p-4 rounded-lg bg-muted" role="status">
                  <p className="font-medium mb-1">Pengenal isyarat belum tersedia</p>
                  <p className="text-sm text-muted-foreground">
                    Model pengenal abjad SIBI belum terpasang. Fitur ini aktif setelah modelnya dipasang.
                  </p>
                </div>
              )}

              <TabsContent value="latihan">
                {model && !practice && (
                  <div className="text-center py-6">
                    <p className="text-lg font-medium mb-2">Latihan mengeja kata dengan abjad jari</p>
                    <p className="text-muted-foreground mb-6">
                      Akan muncul satu kata acak. Peragakan hurufnya satu per satu di depan kamera dan
                      tahan sebentar sampai terbaca. Huruf J dan Z belum dipakai karena isyaratnya bergerak.
                    </p>
                    <Button size="lg" onClick={nextWord}>
                      <Play className="w-5 h-5 mr-2" aria-hidden="true" /> Mulai Berlatih
                    </Button>
                  </div>
                )}

                {model && practice && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-3">
                      {practice.word.length === 1 ? "Peragakan isyarat ini" : "Eja kata ini"}
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 mb-4" aria-label={`Kata ${practice.word}`}>
                      {[...practice.word].map((letter, i) => {
                        const done = i < practice.index;
                        const current = i === practice.index && !celebration;
                        return (
                          <span
                            key={i}
                            className={`w-12 h-14 rounded-xl flex items-center justify-center text-3xl font-black border-2 ${
                              done
                                ? "bg-green-600 border-green-600 text-white"
                                : current
                                ? "border-primary text-primary bg-primary/10"
                                : "border-muted text-muted-foreground"
                            }`}
                            aria-hidden="true"
                          >
                            {letter}
                          </span>
                        );
                      })}
                    </div>

                    <p className="font-medium mb-1" aria-live="polite">
                      {celebration
                        ? `Berhasil mengeja ${celebration.word}!`
                        : `Huruf ${practice.index + 1} dari ${practice.word.length}: ${target}`}
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300 min-h-[1.25rem]" aria-live="polite">
                      {wrongHint}
                    </p>
                    {!cameraOn && (
                      <p className="text-sm text-muted-foreground mt-1">Nyalakan kamera untuk mulai mengeja.</p>
                    )}

                    {reference?.image && (
                      <figure className="mt-3">
                        <img
                          src={reference.image}
                          alt={`Contoh isyarat ${reference.title}: ${reference.description}`}
                          className="w-36 h-36 object-contain mx-auto rounded-lg bg-white"
                        />
                        <figcaption className="text-sm text-muted-foreground mt-2">{reference.description}</figcaption>
                      </figure>
                    )}
                    {reference?.image && <SignCredit className="mt-2" />}

                    <div className="flex flex-wrap justify-center gap-2 mt-5">
                      <Button variant="outline" onClick={() => say(`${practice.word.toLowerCase()}. ${[...practice.word].join(", ")}`)}>
                        <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Dengarkan Kata
                      </Button>
                      <Button variant="outline" onClick={nextWord}>
                        <SkipForward className="w-4 h-4 mr-2" aria-hidden="true" /> Ganti Kata
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-4">Kata berhasil dieja: {solvedCount}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="eja">
                {model && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Eja huruf demi huruf. Tiap huruf yang ditahan sebentar akan masuk ke bawah dan diucapkan.
                      Untuk huruf yang sama dua kali, turunkan tangan sejenak.
                    </p>
                    <div
                      className="min-h-[6rem] p-4 rounded-lg border-2 text-3xl font-bold tracking-widest break-words mb-4"
                      aria-live="polite"
                      aria-label="Hasil ejaan"
                    >
                      {spelled || <span className="text-muted-foreground font-normal text-lg">Belum ada huruf</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => speak(spelled.toLowerCase(), { volume, rate: speakingRate, aiVoice })}
                        disabled={!spelled.trim()}
                      >
                        <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Ucapkan
                      </Button>
                      <Button variant="outline" onClick={() => setSpelled((text) => text + " ")}>
                        <Space className="w-4 h-4 mr-2" aria-hidden="true" /> Spasi
                      </Button>
                      <Button variant="outline" onClick={() => setSpelled((text) => text.slice(0, -1))} disabled={!spelled}>
                        <Delete className="w-4 h-4 mr-2" aria-hidden="true" /> Hapus Huruf
                      </Button>
                      <Button variant="outline" onClick={() => setSpelled("")} disabled={!spelled}>
                        <Eraser className="w-4 h-4 mr-2" aria-hidden="true" /> Bersihkan
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="kamus">
                <SignDictionary
                  practicable={new Set(model?.labels ?? [])}
                  onPractice={practiceSign}
                  onSpeak={(text) => speak(text, { volume, rate: speakingRate, aiVoice })}
                />
              </TabsContent>

              {isStaff && (
                <TabsContent value="rekam">
                  <p className="text-sm text-muted-foreground mb-4">
                    Merekam contoh isyarat untuk melatih ulang model di notebook
                    <code className="mx-1">ml/sibi/sibi_training.ipynb</code>. Yang disimpan hanya posisi
                    titik tangan, bukan gambar. Tiap rekaman berlangsung 3 detik; ubah sedikit sudut dan
                    jarak tangan selama merekam. Berkas CSV hasil unduhan diletakkan di folder data notebook.
                  </p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signer-name">Nama peraga</Label>
                      <Input
                        id="signer-name"
                        value={signer}
                        onChange={(e) => setSigner(e.target.value)}
                        placeholder="Contoh: peraga-1"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Huruf atau angka yang direkam</p>
                      <div className="grid grid-cols-9 gap-1" role="group" aria-label="Pilih huruf atau angka">
                        {RECORDABLE.map((letter) => (
                          <Button
                            key={letter}
                            size="sm"
                            variant={letter === recordLabel ? "default" : "outline"}
                            onClick={() => setRecordLabel(letter)}
                            aria-pressed={letter === recordLabel}
                            aria-label={`${letter}, ${recordedPerLabel[letter] ?? 0} sampel`}
                            className="relative px-0"
                          >
                            {letter}
                            {recordedPerLabel[letter] ? (
                              <span className="absolute -top-1 -right-1 text-[10px] leading-none px-1 py-0.5 rounded-full bg-green-600 text-white">
                                {recordedPerLabel[letter]}
                              </span>
                            ) : null}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={startRecording} disabled={status !== "ready" || isRecording}>
                        {isRecording ? "Merekam..." : `Rekam ${recordLabel}`}
                      </Button>
                      <Button variant="outline" onClick={downloadRows} disabled={rows.length === 0}>
                        <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Unduh CSV ({rows.length} sampel)
                      </Button>
                    </div>
                    {status !== "ready" && (
                      <p className="text-sm text-muted-foreground">Nyalakan kamera untuk mulai merekam.</p>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </Card>
        </div>
      </motion.div>

      {/* Pujian setelah satu kata selesai dieja; lanjut otomatis ke kata berikutnya */}
      <Dialog open={celebration !== null} onOpenChange={(open) => !open && nextWord()}>
        <DialogContent className="text-center">
          <DialogHeader>
            <DialogTitle className="text-3xl text-center">🎉 {celebration?.praise}</DialogTitle>
            <DialogDescription className="text-lg text-center">
              Kamu berhasil mengeja <strong className="text-foreground">{celebration?.word}</strong> dengan isyarat.
            </DialogDescription>
          </DialogHeader>
          <p className="text-5xl font-black tracking-widest text-primary my-2" aria-hidden="true">
            {celebration?.word}
          </p>
          <p className="text-sm text-muted-foreground">Kata berikutnya muncul sebentar lagi.</p>
          <DialogFooter className="sm:justify-center">
            <Button size="lg" onClick={nextWord}>
              Kata Berikutnya <SkipForward className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
