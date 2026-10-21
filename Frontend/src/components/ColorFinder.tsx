import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Pause, Play, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/context/SettingsContext";
import { speak } from "@/lib/speech";
import { averageColor, nameColor } from "@/lib/colorName";
import { useVoiceCommands } from "@/lib/voiceCommands";

// Kenali Warna: arahkan kamera, warna di lingkaran tengah disebut namanya.
// Untuk pengguna buta warna dan low vision. Gambar kamera tidak dikirim ke mana pun.

const SAMPLE_MS = 300;
// Sisi kotak contoh di tengah gambar, sebagai bagian dari sisi terpendek
const SAMPLE_PART = 0.08;
// Nama baru dibacakan setelah stabil sekian contoh berturut-turut, supaya tidak berceloteh
const STABLE_SAMPLES = 3;

type Reading = { name: string; hex: string };

export default function ColorFinder() {
  const { volume, speakingRate, needs } = useSettings();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [frozen, setFrozen] = useState(false);
  // Pengguna netra dan buta warna paling butuh dibacakan; yang lain bisa menyalakannya
  const [autoSpeak, setAutoSpeak] = useState(() => needs.includes("netra") || needs.includes("buta_warna"));
  const lastSpoken = useRef("");

  const say = (text: string) => speak(text, { volume, rate: speakingRate, aiVoice: false });

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCameraOn(true);
    } catch (cause) {
      console.error("Kamera Kenali Warna gagal:", cause);
      setError("Kamera belum bisa dibuka. Izinkan kamera di browser lalu coba lagi.");
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => stop, []);

  useEffect(() => {
    if (cameraOn && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => undefined);
    }
  }, [cameraOn]);

  // Ambil contoh warna di tengah beberapa kali per detik
  useEffect(() => {
    if (!cameraOn || frozen) return;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    let candidate = "";
    let streak = 0;

    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || !context || video.readyState < 2 || !video.videoWidth) return;
      const side = Math.max(4, Math.round(Math.min(video.videoWidth, video.videoHeight) * SAMPLE_PART));
      canvas.width = side;
      canvas.height = side;
      context.drawImage(
        video,
        (video.videoWidth - side) / 2,
        (video.videoHeight - side) / 2,
        side,
        side,
        0,
        0,
        side,
        side
      );
      const { r, g, b } = averageColor(context.getImageData(0, 0, side, side).data);
      const next = nameColor(r, g, b);
      setReading(next);

      streak = next.name === candidate ? streak + 1 : 1;
      candidate = next.name;
      if (streak === STABLE_SAMPLES && next.name !== lastSpoken.current) {
        lastSpoken.current = next.name;
        if (autoSpeak) say(next.name);
      }
    }, SAMPLE_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, frozen, autoSpeak]);

  const speakCurrent = () => say(reading ? `Warnanya ${reading.name}.` : "Kamera belum melihat warna.");

  useVoiceCommands((command) => {
    if (/^(warna apa( ini)?|sebutkan warna|baca warna|ini warna apa)$/.test(command)) {
      speakCurrent();
      return true;
    }
    if (/^(bekukan|tahan|tahan warna)$/.test(command)) {
      setFrozen(true);
      return true;
    }
    if (/^(lanjutkan|lanjut|cair(kan)?)$/.test(command)) {
      setFrozen(false);
      return true;
    }
    return false;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-6">
      <div className="px-card p-3 md:p-5">
        <div className="relative aspect-[3/4] sm:aspect-video overflow-hidden rounded-xl border border-border bg-muted flex items-center justify-center">
          {cameraOn ? (
            <>
              <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              {/* Lingkaran bidik: hanya warna di dalamnya yang dinamai */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-20 w-20 rounded-full border-4 border-white shadow-[0_0_0_3px_rgba(0,0,0,0.7)]" />
              </div>
            </>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <Camera className="mx-auto mb-3 h-12 w-12" aria-hidden="true" />
              <p>Arahkan kamera ke benda, pakaian, atau gambar. Warna di lingkaran tengah akan disebut namanya.</p>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cameraOn ? (
            <Button className="px-btn" variant="outline" onClick={stop}>
              <CameraOff className="mr-2 h-4 w-4" aria-hidden="true" /> Matikan Kamera
            </Button>
          ) : (
            <Button className="px-btn" onClick={start}>
              <Camera className="mr-2 h-4 w-4" aria-hidden="true" /> Nyalakan Kamera
            </Button>
          )}
          <Button
            className="px-btn"
            variant="outline"
            onClick={() => setFrozen((value) => !value)}
            disabled={!cameraOn}
            aria-pressed={frozen}
          >
            {frozen ? <Play className="mr-2 h-4 w-4" aria-hidden="true" /> : <Pause className="mr-2 h-4 w-4" aria-hidden="true" />}
            {frozen ? "Lanjutkan" : "Tahan Warna"}
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm font-medium text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="px-card p-4 md:p-6 flex flex-col gap-5">
        <div className="flex items-center gap-5">
          <div
            aria-hidden="true"
            className="h-24 w-24 shrink-0 rounded-2xl border-2 border-border shadow-inner"
            style={{ backgroundColor: reading?.hex ?? "transparent" }}
          />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Warna di tengah kamera</p>
            {/* Dibacakan pembaca layar hanya saat nama berubah */}
            <p className="px-title text-3xl md:text-4xl capitalize" aria-live="polite">
              {reading ? reading.name : "-"}
            </p>
            {reading && <p className="mt-1 font-mono text-sm text-muted-foreground">{reading.hex}</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button className="px-btn" onClick={speakCurrent} disabled={!reading}>
            <Volume2 className="mr-2 h-4 w-4" aria-hidden="true" /> Bacakan Warna
          </Button>
          <Button
            className="px-btn"
            variant="outline"
            aria-pressed={autoSpeak}
            onClick={() => setAutoSpeak((value) => !value)}
          >
            {autoSpeak ? "Baca otomatis: aktif" : "Baca otomatis: mati"}
          </Button>
        </div>

        <ul className="space-y-1.5 text-sm text-muted-foreground">
          <li>Dekatkan kamera sampai lingkaran penuh berisi satu warna.</li>
          <li>Cahaya redup atau lampu kuning bisa membuat warna terbaca lebih gelap atau lebih kuning.</li>
          <li>Perintah suara: "warna apa ini", "tahan warna", "lanjutkan".</li>
        </ul>
      </div>
    </div>
  );
}
