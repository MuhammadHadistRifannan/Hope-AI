import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, CameraOff, Delete, Download, Eraser, Hand, Space, Volume2 } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSettings } from "@/context/SettingsContext";
import { useRoles } from "@/hooks/use-roles";
import { useHandTracking, type HandFrame } from "@/hooks/use-hand-tracking";
import { toFeatures } from "@/lib/sign/landmarks";
import { loadSignModel, predict, type SignModel } from "@/lib/sign/classifier";
import { Stabilizer, type StabilizerState } from "@/lib/sign/stabilizer";
import { speak, stopSpeech } from "@/lib/speech";
import SignCredit from "@/components/SignCredit";

const MODEL_URL = "/models/sibi-abjad.json";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const RECORD_MS = 3000;

type Reference = { title: string; image: string; description: string };
type RecordedSample = { signer: string; label: string; features: number[][] };

// Garis antar titik tangan untuk digambar di atas video
const BONES = [
  [0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11],
  [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

const stateMessage: Record<StabilizerState, string> = {
  idle: "Tunjukkan tanganmu ke kamera",
  unsure: "Belum yakin. Perjelas bentuk tangan dan dekatkan ke kamera",
  holding: "Tahan sebentar...",
  accepted: "Dikenali!",
};

export default function SignLanguage() {
  const { volume, speakingRate, aiVoice } = useSettings();
  const { isStaff } = useRoles();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stabilizer = useRef(new Stabilizer());

  const [mode, setMode] = useState("latihan");
  const [cameraOn, setCameraOn] = useState(false);
  const [model, setModel] = useState<SignModel | null>(null);
  const [modelChecked, setModelChecked] = useState(false);
  const [references, setReferences] = useState<Record<string, Reference>>({});

  // Yang tampil di layar; diperbarui beberapa kali per detik, bukan tiap frame
  const [guess, setGuess] = useState<{ label: string; confidence: number } | null>(null);
  const [state, setState] = useState<StabilizerState>("idle");
  const [progress, setProgress] = useState(0);
  const lastUiUpdate = useRef(0);

  // Mode Latihan
  const [target, setTarget] = useState("A");
  const [correctCount, setCorrectCount] = useState(0);
  const [justCorrect, setJustCorrect] = useState(false);

  // Mode Eja ke Suara
  const [spelled, setSpelled] = useState("");

  // Mode Rekam Data (guru dan admin)
  const [signer, setSigner] = useState("");
  const [recordLabel, setRecordLabel] = useState("A");
  const [samples, setSamples] = useState<RecordedSample[]>([]);
  const [recordingUntil, setRecordingUntil] = useState(0);
  const recordingBuffer = useRef<number[][]>([]);

  const labels = useMemo(() => model?.labels ?? [], [model]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    loadSignModel(MODEL_URL).then((loaded) => {
      setModel(loaded);
      setModelChecked(true);
      if (loaded?.labels.length) setTarget(loaded.labels[0]);
    });

    supabase
      .from("sign_items")
      .select("slug, title, description, image_url")
      .eq("category", "abjad")
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

    return () => stopSpeech();
  }, []);

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

  const nextTarget = (current: string) => {
    const pool = labels.length ? labels : ALPHABET;
    return pool[(pool.indexOf(current) + 1) % pool.length];
  };

  const handleAccepted = (label: string) => {
    if (modeRef.current === "eja") {
      setSpelled((text) => text + label);
    } else if (modeRef.current === "latihan" && label === targetRef.current) {
      setCorrectCount((count) => count + 1);
      setJustCorrect(true);
      speak(`Benar, huruf ${label}`, { volume, rate: speakingRate, aiVoice: false });
      setTimeout(() => {
        setJustCorrect(false);
        setTarget((current) => nextTarget(current));
      }, 1200);
    }
  };

  const onFrame = (frame: HandFrame, now: number) => {
    drawHand(frame);
    const features = frame ? toFeatures(frame.landmarks, frame.handedness) : null;

    // Rekam Data: kumpulkan ciri tangan selama jendela rekam berjalan
    if (recordingUntil > 0) {
      if (features) recordingBuffer.current.push(features.map((v) => Math.round(v * 1e4) / 1e4));
      if (now >= recordingUntil) finishRecording();
      return;
    }

    let prediction = null;
    if (features && model) prediction = predict(model, features);

    const accepted = stabilizer.current.push(
      prediction?.label ?? null,
      prediction?.confidence ?? 0,
      now
    );
    if (accepted) handleAccepted(accepted);

    if (now - lastUiUpdate.current > 120 || accepted) {
      lastUiUpdate.current = now;
      setGuess(prediction);
      setState(stabilizer.current.state);
      setProgress(stabilizer.current.progress);
    }
  };

  const { status, error } = useHandTracking(videoRef, cameraOn, onFrame);

  const startRecording = () => {
    recordingBuffer.current = [];
    setRecordingUntil(performance.now() + RECORD_MS);
  };

  const finishRecording = () => {
    const features = recordingBuffer.current;
    recordingBuffer.current = [];
    setRecordingUntil(0);
    if (features.length < 10) return; // tangan hampir tidak terlihat
    setSamples((all) => [...all, { signer: signer.trim() || "tanpa-nama", label: recordLabel, features }]);
    setRecordLabel((current) => ALPHABET[(ALPHABET.indexOf(current) + 1) % ALPHABET.length]);
  };

  const downloadSamples = () => {
    const blob = new Blob([JSON.stringify(samples)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `sibi-${(signer.trim() || "tanpa-nama").replace(/\s+/g, "-")}-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const changeMode = (next: string) => {
    setMode(next);
    stabilizer.current.reset();
    stopSpeech();
  };

  const speakSpelled = () => {
    if (spelled.trim()) speak(spelled.toLowerCase(), { volume, rate: speakingRate, aiVoice });
  };

  const reference = references[target];
  const recordedPerLabel = samples.reduce<Record<string, number>>((count, sample) => {
    count[sample.label] = (count[sample.label] ?? 0) + 1;
    return count;
  }, {});
  const isRecording = recordingUntil > 0;
  const modelMissing = modelChecked && !model;

  return (
    <div className="min-h-screen p-2 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 gradient-text">Isyarat</h1>
          <p className="text-muted-foreground text-base md:text-lg">
            Berlatih abjad jari SIBI dengan kamera, atau mengeja kata untuk diucapkan
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kamera */}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-3">
                  <Hand className="w-12 h-12" aria-hidden="true" />
                  <p>Kamera belum menyala</p>
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

            <div className="mt-4 min-h-[4.5rem]" role="status" aria-live="polite">
              {status === "loading" && <p>Menyiapkan kamera dan pelacak tangan...</p>}
              {status === "error" && <p className="text-destructive font-medium">{error}</p>}
              {status === "ready" && mode !== "rekam" && !modelMissing && (
                <>
                  <p className="font-medium">
                    {stateMessage[state]}
                    {guess && state !== "idle" && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        · tebakan: {guess.label} ({Math.round(guess.confidence * 100)}%)
                      </span>
                    )}
                  </p>
                  <Progress value={progress * 100} className="mt-2" aria-label="Kestabilan isyarat" />
                </>
              )}
              {status === "ready" && mode === "rekam" && (
                <p className="font-medium">
                  {isRecording ? "Tahan bentuk tangan dan gerakkan sedikit..." : "Siap merekam"}
                </p>
              )}
            </div>
          </Card>

          {/* Mode */}
          <Card className="p-3 md:p-6">
            <Tabs value={mode} onValueChange={changeMode}>
              <TabsList className="mb-6">
                <TabsTrigger value="latihan">Latihan</TabsTrigger>
                <TabsTrigger value="eja">Eja ke Suara</TabsTrigger>
                {isStaff && <TabsTrigger value="rekam">Rekam Data</TabsTrigger>}
              </TabsList>

              {modelMissing && mode !== "rekam" && (
                <div className="p-4 rounded-lg bg-muted" role="status">
                  <p className="font-medium mb-1">Pengenal isyarat belum tersedia</p>
                  <p className="text-sm text-muted-foreground">
                    Model pengenal abjad SIBI belum dilatih. Fitur ini akan aktif setelah modelnya
                    dipasang.
                  </p>
                </div>
              )}

              <TabsContent value="latihan">
                {!modelMissing && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Peragakan huruf ini</p>
                    <p
                      className={`text-8xl font-black mb-4 ${justCorrect ? "text-green-600" : "text-primary"}`}
                      aria-live="polite"
                    >
                      {target}
                    </p>
                    {reference?.image && (
                      <img
                        src={reference.image}
                        alt={`Isyarat ${reference.title}: ${reference.description}`}
                        className="w-40 h-40 object-contain mx-auto mb-3 rounded-lg bg-white"
                      />
                    )}
                    {reference && <p className="text-sm text-muted-foreground mb-2">{reference.description}</p>}
                    {reference?.image && <SignCredit className="mb-6" />}
                    <p className="font-medium mb-4" aria-live="polite">
                      {justCorrect ? "Benar! 🎉" : `Benar sejauh ini: ${correctCount}`}
                    </p>
                    <Button variant="outline" onClick={() => setTarget(nextTarget(target))}>
                      Lewati Huruf Ini
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="eja">
                {!modelMissing && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Eja huruf demi huruf. Tiap huruf yang ditahan sebentar akan masuk ke bawah.
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
                      <Button onClick={speakSpelled} disabled={!spelled.trim()}>
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

              {isStaff && (
                <TabsContent value="rekam">
                  <p className="text-sm text-muted-foreground mb-4">
                    Merekam contoh isyarat untuk melatih pengenal. Yang disimpan hanya posisi titik
                    tangan, bukan gambar. Tiap rekaman berlangsung 3 detik; ubah sedikit sudut dan
                    jarak tangan selama merekam.
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
                      <p className="text-sm font-medium mb-2">Huruf yang direkam</p>
                      <div className="grid grid-cols-9 gap-1" role="group" aria-label="Pilih huruf">
                        {ALPHABET.map((letter) => (
                          <Button
                            key={letter}
                            size="sm"
                            variant={letter === recordLabel ? "default" : "outline"}
                            onClick={() => setRecordLabel(letter)}
                            aria-pressed={letter === recordLabel}
                            aria-label={`Huruf ${letter}, ${recordedPerLabel[letter] ?? 0} rekaman`}
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
                        {isRecording ? "Merekam..." : `Rekam Huruf ${recordLabel}`}
                      </Button>
                      <Button variant="outline" onClick={downloadSamples} disabled={samples.length === 0}>
                        <Download className="w-4 h-4 mr-2" aria-hidden="true" /> Unduh ({samples.length} rekaman)
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
    </div>
  );
}
