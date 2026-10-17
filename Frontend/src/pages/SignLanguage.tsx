import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera, CameraOff, Delete, Download, Eraser, Hand, Play, SkipForward, Space, Volume2,
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Card } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
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
import { normalizeLandmarks, toFeatures, toPixels } from "@/lib/sign/landmarks";
import { loadSignModel, predict, type Prediction, type SignModel } from "@/lib/sign/classifier";
import { Stabilizer, type StabilizerState } from "@/lib/sign/stabilizer";
import { speak, stopSpeech } from "@/lib/speech";
import SignCredit from "@/components/SignCredit";
import SignDictionary from "@/components/SignDictionary";
import BisindoPanel, { WORD_MIN_CONFIDENCE, type SignResult } from "@/components/BisindoPanel";
import { SignSegmenter, loadWordModel, predictWord, type WordModel, type WordPrediction } from "@/lib/sign/bisindo";
import OtomatisPanel from "@/components/OtomatisPanel";
import {
  ROUTER_CONFIG, SYSTEM_NAME, SignRouter, appendToTranscript, closeSpelling, removeLast, transcriptText,
  type RouterEvent, type RouterLive, type SignSystem, type TranscriptPart,
} from "@/lib/sign/router";
import { readSignPreference, saveSignPreference, type SignLanguage as Language } from "@/lib/sign/preference";
import { useSearchParams } from "react-router-dom";

const MODEL_URL = "/models/sibi-abjad.json";
const WORD_MODEL_URL = "/models/bisindo-kata.json";
// Lama hasil kata BISINDO ditampilkan di atas video
const WORD_RESULT_MS = 2500;
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
type AutoLive = RouterLive & { letter: Prediction | null; last: { event: RouterEvent; at: number } | null };
type WordLive = {
  hasHand: boolean;
  poseMissing: boolean;
  signing: boolean;
  tooLong: boolean;
  last: { prediction: WordPrediction; at: number } | null;
};

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
  // ?bahasa=bisindo (atau sibi, otomatis) membuka langsung bahasa itu;
  // tanpa itu, pilihan terakhir di perangkat ini dipakai lagi
  const languageFromUrl = searchParams.get("bahasa");
  const isLanguage = (value: string | null): value is Language =>
    value === "sibi" || value === "bisindo" || value === "otomatis";
  const [saved] = useState(readSignPreference);
  const [language, setLanguage] = useState<Language>(isLanguage(languageFromUrl) ? languageFromUrl : saved.language);
  const [preferred, setPreferred] = useState<SignSystem>(saved.preferred);
  useEffect(() => {
    if (isLanguage(languageFromUrl)) setLanguage(languageFromUrl);
  }, [languageFromUrl]);
  // SIBI atau BISINDO yang terakhir dipakai menjadi sistem yang diutamakan mode Otomatis
  useEffect(() => {
    if (language !== "otomatis") setPreferred(language);
  }, [language]);
  useEffect(() => saveSignPreference({ language, preferred }), [language, preferred]);
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

  // Kata BISINDO: model urutan, pemotong isyarat, dan hasil terakhir
  const [wordModel, setWordModel] = useState<WordModel | null>(null);
  const [wordModelChecked, setWordModelChecked] = useState(false);
  const segmenter = useRef(new SignSegmenter());
  const [wordLive, setWordLive] = useState<WordLive>({
    hasHand: false, poseMissing: false, signing: false, tooLong: false, last: null,
  });
  const [signResult, setSignResult] = useState<SignResult | null>(null);
  const [wordTarget, setWordTarget] = useState<string | null>(null);
  const lastWord = useRef<WordLive["last"]>(null);
  const tooLong = useRef(false);

  // Mode Otomatis: router memilih huruf SIBI atau kata BISINDO; ambangnya
  // mengikuti sistem yang diutamakan
  const makeRouter = (system: SignSystem) =>
    new SignRouter((sequence) => {
      const current = latest.current.wordModel;
      return current ? predictWord(current, sequence) : null;
    }, ROUTER_CONFIG[system]);
  const router = useRef<SignRouter>();
  if (!router.current) router.current = makeRouter(preferred);
  useEffect(() => {
    router.current = makeRouter(preferred);
  }, [preferred]);
  const [transcript, setTranscript] = useState<TranscriptPart[]>([]);
  const lastAuto = useRef<AutoLive["last"]>(null);
  const [autoLive, setAutoLive] = useState<AutoLive>({ ...router.current.live, letter: null, last: null });

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
  const latest = useRef({ mode, practice, words, celebration, language, wordModel });
  latest.current = { mode, practice, words, celebration, language, wordModel };

  useEffect(() => {
    loadSignModel(MODEL_URL).then((loaded) => {
      setModel(loaded);
      setModelChecked(true);
    });
    loadWordModel(WORD_MODEL_URL).then((loaded) => {
      setWordModel(loaded);
      setWordModelChecked(true);
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
    for (const hand of frame.hands) {
      for (const [a, b] of BONES) {
        context.beginPath();
        context.moveTo(hand[a].x * canvas.width, hand[a].y * canvas.height);
        context.lineTo(hand[b].x * canvas.width, hand[b].y * canvas.height);
        context.stroke();
      }
      for (const point of hand) {
        context.beginPath();
        context.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, Math.PI * 2);
        context.fill();
      }
    }
  };

  // --- Kata BISINDO: satu isyarat dibaca setelah tangan diturunkan ---
  const onWordFrame = (frame: HandFrame, now: number) => {
    const hands = frame ? frame.hands.map((hand) => toPixels(hand, frame.width, frame.height)) : [];
    const pose = frame?.pose ? toPixels(frame.pose, frame.width, frame.height) : null;
    const event = segmenter.current.push(hands, pose, now);

    if (event?.type === "too-long") tooLong.current = true;
    if (event?.type === "sign") {
      const current = latest.current.wordModel;
      const prediction = current ? predictWord(current, event.sequence) : null;
      if (prediction) lastWord.current = { prediction, at: now };
      setSignResult({ id: now, prediction, frames: event.frames });
    }
    // Peringatan "terlalu lama" hilang setelah tangan diturunkan
    if (!segmenter.current.signing && hands.length === 0) tooLong.current = false;

    if (now - lastUiUpdate.current > 120 || event) {
      lastUiUpdate.current = now;
      const last = lastWord.current && now - lastWord.current.at < WORD_RESULT_MS ? lastWord.current : null;
      setWordLive({
        hasHand: hands.length > 0,
        poseMissing: hands.length > 0 && !pose,
        signing: segmenter.current.signing,
        tooLong: tooLong.current,
        last,
      });
    }
  };

  // --- Otomatis: huruf SIBI dan kata BISINDO dari satu kamera ---
  const onAutoFrame = (frame: HandFrame, now: number) => {
    const hands = frame ? frame.hands.map((hand) => toPixels(hand, frame.width, frame.height)) : [];
    const pose = frame?.pose ? toPixels(frame.pose, frame.width, frame.height) : null;
    // Model SIBI hanya dijalankan saat satu tangan terlihat
    const features = hands.length === 1 && model ? normalizeLandmarks(hands[0]) : null;
    const letter = features && model ? predict(model, features) : null;
    const events = router.current!.push(hands, pose, letter, now);

    for (const event of events) {
      lastAuto.current = { event, at: now };
      if (event.type === "unsure") continue;
      setTranscript((parts) => appendToTranscript(parts, event));
      say(event.type === "letter" ? event.label : event.label.toLowerCase());
    }

    if (now - lastUiUpdate.current > 120 || events.length) {
      lastUiUpdate.current = now;
      const last = lastAuto.current && now - lastAuto.current.at < WORD_RESULT_MS ? lastAuto.current : null;
      setAutoLive({ ...router.current!.live, letter, last });
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
    if (latest.current.language === "bisindo") {
      onWordFrame(frame, now);
      return;
    }
    if (latest.current.language === "otomatis") {
      onAutoFrame(frame, now);
      return;
    }

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

  const { status, error } = useHandTracking(videoRef, cameraOn, onFrame, language !== "sibi");

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
    segmenter.current.reset();
    stopSpeech();
  };

  const changeLanguage = (next: Language) => {
    if (next === language) return;
    setLanguage(next);
    setMode((current) => (current === "kamus" || current === "rekam" ? current : "latihan"));
    setPractice(null);
    setCelebration(null);
    clearTimeout(nextWordTimer.current);
    stabilizer.current.reset();
    segmenter.current.reset();
    router.current!.reset();
    lastWord.current = null;
    lastAuto.current = null;
    stopSpeech();
  };

  const onWordTarget = useCallback((word: string | null) => setWordTarget(word), []);

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
        <PageHeader
          title="Isyarat"
          description={
            language === "otomatis"
              ? "Peragakan kata BISINDO atau eja huruf SIBI tanpa berganti mode. Setiap hasil diberi label sistemnya, lalu disusun menjadi kalimat yang bisa diucapkan."
              : language === "bisindo"
              ? "Lihat contoh kata dasar BISINDO di tab Kamus, lalu peragakan dengan dua tangan di depan kamera. Kamera mengenali katanya dan membacakannya."
              :"Lihat contoh abjad dan angka SIBI di tab Kamus, lalu tirukan di depan kamera. Kamera mengenali huruf yang kamu peragakan dan membacakannya."
          }
          art="isyarat"
          lively={cameraOn}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kamera dan hasil pengenalan */}
          <Card className="px-card p-3 md:p-6">
            <div className="relative aspect-[3/4] sm:aspect-[4/3] overflow-hidden bg-black rounded-xl border border-border">
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
              {cameraOn && status === "ready" && language === "sibi" && model && mode !== "rekam" && (
                <div className="absolute top-3 left-3 rounded-xl bg-black/60 text-white px-4 py-3 min-w-[7.5rem]" aria-hidden="true">
                  {!live.hasHand ? (
                    <p className="text-sm">Tangan belum terlihat</p>
                  ) : confident ? (
                    <>
                      <p className="px-title text-5xl leading-none">{guess!.label}</p>
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
                    <div className="mt-2 h-2 bg-white/25 overflow-hidden">
                      <div className="h-full bg-amber-300 transition-all" style={{ width: `${live.progress * 100}%` }} />
                    </div>
                  )}
                </div>
              )}

              {cameraOn && status === "ready" && language === "bisindo" && wordModel && mode !== "rekam" && (
                <div className="absolute top-3 left-3 rounded-xl bg-black/60 text-white px-4 py-3 max-w-[60%]" aria-hidden="true">
                  {wordLive.tooLong ? (
                    <p className="text-sm">Turunkan tangan setelah tiap isyarat</p>
                  ) : wordLive.poseMissing ? (
                    <p className="text-sm">Mundur sedikit sampai kedua bahu terlihat</p>
                  ) : wordLive.signing ? (
                    <p className="text-lg font-bold leading-tight">Membaca gerakan…</p>
                  ) : wordLive.last ? (
                    wordLive.last.prediction.confidence >= WORD_MIN_CONFIDENCE ? (
                      <>
                        <p className="px-title text-2xl leading-tight">{wordLive.last.prediction.label}</p>
                        <p className="text-sm mt-1">Yakin {Math.round(wordLive.last.prediction.confidence * 100)}%</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-bold leading-tight">Belum yakin</p>
                        <p className="text-sm text-white/80">
                          Mirip {wordLive.last.prediction.label} ({Math.round(wordLive.last.prediction.confidence * 100)}%)
                        </p>
                      </>
                    )
                  ) : (
                    <p className="text-sm">Peragakan satu kata, lalu turunkan tangan</p>
                  )}
                </div>
              )}

              {cameraOn && status === "ready" && language === "otomatis" && model && wordModel && (
                <div className="absolute top-3 left-3 border-[3px] border-white/70 bg-[#0a1a4f]/85 text-white px-4 py-3 max-w-[60%]" aria-hidden="true">
                  {autoLive.last ? (
                    autoLive.last.event.type === "unsure" ? (
                      <>
                        <p className="text-lg font-bold leading-tight">Belum yakin</p>
                        <p className="text-sm text-white/80">
                          Mirip {autoLive.last.event.label} (BISINDO, {Math.round(autoLive.last.event.confidence * 100)}%)
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="px-title text-2xl leading-tight">{autoLive.last.event.label}</p>
                        <p className="text-sm mt-1">
                          {SYSTEM_NAME[autoLive.last.event.system]} · Yakin {Math.round(autoLive.last.event.confidence * 100)}%
                        </p>
                      </>
                    )
                  ) : (
                    <p className="text-sm">
                      {autoLive.hands === 0
                        ? "Tangan belum terlihat"
                        : autoLive.spelling
                        ? "Mengeja huruf SIBI…"
                        : autoLive.still
                        ? "Tahan untuk huruf SIBI"
                        : "Membaca gerakan BISINDO…"}
                    </p>
                  )}
                  {autoLive.letterState === "holding" && autoLive.letter && (
                    <>
                      <p className="text-sm mt-2">Huruf {autoLive.letter.label}? (SIBI)</p>
                      <div className="mt-1 h-2 bg-white/25 overflow-hidden">
                        <div className="h-full bg-amber-300 transition-all" style={{ width: `${autoLive.letterProgress * 100}%` }} />
                      </div>
                    </>
                  )}
                </div>
              )}

              {wordTarget && language === "bisindo" && mode === "latihan" && cameraOn && (
                <div className="absolute top-3 right-3 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-center max-w-[40%]" aria-hidden="true">
                  <p className="text-xs font-bold">Peragakan</p>
                  <p className="px-title text-xl leading-tight mt-1">{wordTarget}</p>
                </div>
              )}

              {target && language === "sibi" && mode === "latihan" && cameraOn && (
                <div className="absolute top-3 right-3 rounded-xl bg-primary text-primary-foreground px-4 py-3 text-center" aria-hidden="true">
                  <p className="text-xs font-bold">Peragakan</p>
                  <p className="px-title text-4xl leading-none mt-1">{target}</p>
                </div>
              )}

              {isRecording && (
                <div className="absolute top-3 left-3 px-3 py-1 border-2 border-white bg-red-600 text-white text-sm font-bold">
                  Merekam {recordLabel}
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                onClick={() => setCameraOn((on) => !on)}
                variant={cameraOn ? "outline" : "default"}
                className={cameraOn ? "px-btn" : "px-btn"}
              >
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
              {status === "loading" && <p>Menyiapkan kamera dan pelacak tangan…</p>}
              {status === "error" && <p className="text-destructive font-medium">{error}</p>}
              {status === "ready" && language === "sibi" && mode === "rekam" && (
                <p className="font-medium">
                  {isRecording ? "Tahan bentuk tangan dan gerakkan sedikit…" : "Siap merekam"}
                </p>
              )}
              {status === "ready" && language === "sibi" && mode !== "rekam" && model && (
                <p className="text-sm text-muted-foreground">
                  {live.state === "accepted" && guess ? `Terbaca huruf ${guess.label}` : ""}
                </p>
              )}
              {status === "ready" && language === "bisindo" && mode !== "rekam" && wordModel && (
                <p className="text-sm text-muted-foreground">
                  {wordLive.last
                    ? wordLive.last.prediction.confidence >= WORD_MIN_CONFIDENCE
                      ? `Terbaca kata ${wordLive.last.prediction.label}`
                      : "Kata belum yakin terbaca"
                    : ""}
                </p>
              )}
              {status === "ready" && language === "otomatis" && model && wordModel && (
                <p className="text-sm text-muted-foreground">
                  {autoLive.last
                    ? autoLive.last.event.type === "letter"
                      ? `Terbaca huruf ${autoLive.last.event.label} (SIBI)`
                      : autoLive.last.event.type === "word"
                      ? `Terbaca kata ${autoLive.last.event.label} (BISINDO)`
                      : "Isyarat belum yakin terbaca"
                    : ""}
                </p>
              )}
            </div>
          </Card>

          {/* Mode */}
          <Card className="px-card p-3 md:p-6">
            <div className="flex gap-1.5 mb-4" role="group" aria-label="Bahasa isyarat">
              {([
                { id: "sibi", title: "SIBI", detail: "Abjad, satu tangan" },
                { id: "bisindo", title: "BISINDO", detail: "Kata dasar, dua tangan" },
                { id: "otomatis", title: "Otomatis", detail: "Huruf dan kata, eksperimen" },
              ] as const).map((option) => (
                <Button
                  key={option.id}
                  variant={language === option.id ? "default" : "outline"}
                  aria-pressed={language === option.id}
                  onClick={() => changeLanguage(option.id)}
                  className={`px-btn flex-1 h-auto py-2 flex-col items-center ${language === option.id ? "!bg-primary !text-primary-foreground" : ""}`}
                >
                  <span className="font-bold">{option.title}</span>
                  <span className="text-xs font-normal">{option.detail}</span>
                </Button>
              ))}
            </div>

            {language === "otomatis" ? (
              <OtomatisPanel
                parts={transcript}
                preferred={preferred}
                onPreferredChange={setPreferred}
                modelsMissing={(modelChecked && !model) || (wordModelChecked && !wordModel)}
                cameraOn={cameraOn}
                onSpace={() => setTranscript(closeSpelling)}
                onDeleteLast={() => setTranscript(removeLast)}
                onClear={() => setTranscript([])}
                onSpeak={() => speak(transcriptText(transcript), { volume, rate: speakingRate, aiVoice })}
              />
            ) : language === "bisindo" ? (
              <BisindoPanel
                mode={mode}
                onModeChange={changeMode}
                model={wordModel}
                modelChecked={wordModelChecked}
                cameraOn={cameraOn}
                trackingReady={status === "ready"}
                result={signResult}
                isStaff={isStaff}
                onTargetChange={onWordTarget}
                say={say}
                speak={(text) => speak(text, { volume, rate: speakingRate, aiVoice })}
              />
            ) : (
            <Tabs value={mode} onValueChange={changeMode}>
              <TabsList className="px-tabs mb-6 flex w-full flex-wrap justify-start">
                <TabsTrigger value="latihan" className="px-tab flex-1">Latihan</TabsTrigger>
                <TabsTrigger value="eja" className="px-tab flex-1">Eja ke Suara</TabsTrigger>
                <TabsTrigger value="kamus" className="px-tab flex-1">Kamus</TabsTrigger>
                {isStaff && <TabsTrigger value="rekam" className="px-tab flex-1">Rekam Data</TabsTrigger>}
              </TabsList>

              {modelMissing && mode !== "rekam" && mode !== "kamus" && (
                <div className="px-well p-4" role="status">
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
                    <Button size="lg" onClick={nextWord} className="px-btn">
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
                            className={`px-title w-12 h-14 flex items-center justify-center text-3xl border ${
                              done
                                ? "bg-emerald-600 border-foreground text-white"
                                : current
                                ? "border-foreground bg-primary text-primary-foreground"
                                : "border-foreground/30 text-muted-foreground"
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
                          className="w-36 h-36 object-contain mx-auto rounded-xl border border-border bg-white"
                        />
                        <figcaption className="text-sm text-muted-foreground mt-2">{reference.description}</figcaption>
                      </figure>
                    )}
                    {reference?.image && <SignCredit className="mt-2" />}

                    <div className="flex flex-wrap justify-center gap-2 mt-5">
                      <Button className="px-btn" variant="outline" onClick={() => say(`${practice.word.toLowerCase()}. ${[...practice.word].join(", ")}`)}>
                        <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Dengarkan Kata
                      </Button>
                      <Button className="px-btn" variant="outline" onClick={nextWord}>
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
                      className="px-well px-title min-h-[6rem] p-4 text-3xl break-words mb-4"
                      aria-live="polite"
                      aria-label="Hasil ejaan"
                    >
                      {spelled || <span className="font-sans text-muted-foreground font-normal text-lg">Belum ada huruf</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button className="px-btn"
                        onClick={() => speak(spelled.toLowerCase(), { volume, rate: speakingRate, aiVoice })}
                        disabled={!spelled.trim()}
                      >
                        <Volume2 className="w-4 h-4 mr-2" aria-hidden="true" /> Ucapkan
                      </Button>
                      <Button className="px-btn" variant="outline" onClick={() => setSpelled((text) => text + " ")}>
                        <Space className="w-4 h-4 mr-2" aria-hidden="true" /> Spasi
                      </Button>
                      <Button className="px-btn" variant="outline" onClick={() => setSpelled((text) => text.slice(0, -1))} disabled={!spelled}>
                        <Delete className="w-4 h-4 mr-2" aria-hidden="true" /> Hapus Huruf
                      </Button>
                      <Button className="px-btn" variant="outline" onClick={() => setSpelled("")} disabled={!spelled}>
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
                        className="h-11 rounded-xl border border-border bg-card"
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
                            className="px-btn relative px-0"
                          >
                            {letter}
                            {recordedPerLabel[letter] ? (
                              <span className="absolute -top-1.5 -right-1.5 text-[10px] leading-none px-1 py-0.5 border border-foreground bg-emerald-600 text-white">
                                {recordedPerLabel[letter]}
                              </span>
                            ) : null}
                          </Button>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button className="px-btn" onClick={startRecording} disabled={status !== "ready" || isRecording}>
                        {isRecording ? "Merekam…" : `Rekam ${recordLabel}`}
                      </Button>
                      <Button className="px-btn" variant="outline" onClick={downloadRows} disabled={rows.length === 0}>
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
            )}
          </Card>
        </div>
      </motion.div>

      {/* Pujian setelah satu kata selesai dieja; lanjut otomatis ke kata berikutnya */}
      <Dialog open={celebration !== null} onOpenChange={(open) => !open && nextWord()}>
        <DialogContent className="text-center rounded-xl border border-border">
          <DialogHeader>
            <DialogTitle className="px-title text-2xl text-center">{celebration?.praise}</DialogTitle>
            <DialogDescription className="text-lg text-center">
              Kamu berhasil mengeja <strong className="text-foreground">{celebration?.word}</strong> dengan isyarat.
            </DialogDescription>
          </DialogHeader>
          <p className="px-title text-3xl text-primary my-3" aria-hidden="true">
            {celebration?.word}
          </p>
          <p className="text-sm text-muted-foreground">Kata berikutnya muncul sebentar lagi.</p>
          <DialogFooter className="sm:justify-center">
            <Button size="lg" onClick={nextWord} className="px-btn">
              Kata Berikutnya <SkipForward className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
