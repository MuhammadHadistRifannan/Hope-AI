import { useEffect, useRef, useState, type RefObject } from "react";
import { LIVE_OCR, motion, sharpness, textSimilarity, toGray, type LiveState } from "@/lib/liveOcr";

// Mode Langsung EyeRead. Kamera diperiksa beberapa kali per detik di perangkat:
//   1. Apakah kamera cukup diam dan gambarnya tajam (lib/liveOcr).
//   2. Apakah pemandangannya berbeda dari foto terakhir yang dikirim.
// Bila ya, satu foto langsung dikirim lewat onRead (OCR Gemini di server). Tesseract
// di perangkat hanya memberi kotak sorot kata selama menunggu; ia dimuat di latar
// belakang dan tidak pernah menjadi syarat membaca, karena di ponsel sering lambat
// dimuat dan kurang yakin pada foto kamera.

export type LiveBox = { x: number; y: number; w: number; h: number };

type Options = {
  videoRef: RefObject<HTMLVideoElement>;
  enabled: boolean;
  // Jeda pemeriksaan, misalnya selama hasil sedang dibacakan
  paused: boolean;
  // Mengirim foto ke OCR Gemini: teks hasil baca, "" bila tidak ada tulisan, null bila gagal
  onRead: (image: Blob) => Promise<string | null>;
  // Dipanggil hanya untuk teks halaman baru (bukan halaman yang sama terbaca ulang)
  onNewText: (text: string) => void;
};

type TesseractWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { words?: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[] } }>;
  terminate: () => Promise<void>;
};

const TICK_MS = 400;
// Jarak minimal antarkiriman ke server (batas server 30 permintaan per menit)
const SEND_EVERY_MS = 3000;
// Setelah OCR Gemini gagal, coba lagi paling cepat sekian milidetik kemudian
const RETRY_AFTER_MS = 6000;
// Kotak sorot dari Tesseract paling sering sekali per 1,5 detik supaya ponsel tidak panas
const BOXES_EVERY_MS = 1500;
const BOXES_WIDTH = 640;

export function useLiveOcr({ videoRef, enabled, paused, onRead, onNewText }: Options) {
  const [state, setState] = useState<LiveState | "menyiapkan">("menyiapkan");
  const [preview, setPreview] = useState("");
  const [boxes, setBoxes] = useState<LiveBox[]>([]);
  const [frame, setFrame] = useState({ width: 1280, height: 720 });

  const latest = useRef({ paused, onRead, onNewText });
  latest.current = { paused, onRead, onNewText };

  useEffect(() => {
    if (!enabled) {
      setBoxes([]);
      setPreview("");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let worker: TesseractWorker | null = null;
    let previous: Float32Array | null = null;
    // Gambar kecil dari foto terakhir yang dikirim, untuk tahu apakah pemandangan sudah berganti
    let lastSent: Float32Array | null = null;
    let stillCount = 0;
    // Siap membaca pemandangan berikutnya: benar di awal dan setelah ada gerakan besar
    let armed = true;
    let sending = false;
    let boxesBusy = false;
    let lastSentAt = 0;
    let lastBoxesAt = 0;
    let lastRead = "";
    let lastFailAt = 0;

    const small = document.createElement("canvas");
    const mid = document.createElement("canvas");

    // Tesseract dimuat di latar belakang; pemeriksaan kamera tidak menunggunya
    const loadWorker = async () => {
      const Tesseract = (window as unknown as { Tesseract?: { createWorker: (lang: string) => Promise<TesseractWorker> } }).Tesseract;
      if (!Tesseract) return;
      try {
        const created = await Tesseract.createWorker("ind");
        if (cancelled) created.terminate();
        else worker = created;
      } catch (error) {
        console.warn("Pengenal teks di perangkat gagal disiapkan:", error);
      }
    };

    const capture = (canvas: HTMLCanvasElement, video: HTMLVideoElement, width: number) => {
      const scale = width / video.videoWidth;
      canvas.width = width;
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      return { context, scale };
    };

    const next = () => {
      if (!cancelled) timer = setTimeout(tick, TICK_MS);
    };

    // Kotak sorot kata: tidak ditunggu dan tidak menentukan apa pun
    const updateBoxes = async (video: HTMLVideoElement) => {
      if (!worker || boxesBusy || Date.now() - lastBoxesAt < BOXES_EVERY_MS) return;
      boxesBusy = true;
      lastBoxesAt = Date.now();
      try {
        const { scale } = capture(mid, video, Math.min(BOXES_WIDTH, video.videoWidth));
        const { data } = await worker.recognize(mid);
        if (cancelled) return;
        const found = (data.words ?? []).filter((word) => word.confidence >= 50 && word.text.trim().length >= 2);
        setBoxes(
          found.map(({ bbox }) => ({
            x: bbox.x0 / scale,
            y: bbox.y0 / scale,
            w: (bbox.x1 - bbox.x0) / scale,
            h: (bbox.y1 - bbox.y0) / scale,
          }))
        );
        setPreview(found.map((word) => word.text).join(" "));
      } catch (error) {
        console.warn("Kotak sorot Mode Langsung:", error);
      } finally {
        boxesBusy = false;
      }
    };

    const send = async (video: HTMLVideoElement, gray: Float32Array) => {
      sending = true;
      lastSentAt = Date.now();
      lastSent = gray;
      armed = false;
      setState("mengirim");
      try {
        const full = document.createElement("canvas");
        capture(full, video, video.videoWidth);
        const blob = await new Promise<Blob | null>((resolve) => full.toBlob(resolve, "image/jpeg", 0.9));
        if (!blob || cancelled) return;
        const result = await latest.current.onRead(blob);
        if (cancelled) return;
        if (result === null) {
          // Gagal: boleh mengirim pemandangan yang sama lagi setelah jeda
          lastFailAt = Date.now();
          lastSent = null;
          armed = true;
          setState("terdeteksi");
        } else if (!result.trim()) {
          setState("kosong");
        } else {
          // Kamera bergeser sedikit di halaman yang sama: jangan dibacakan ulang
          if (textSimilarity(result, lastRead) < LIVE_OCR.newBelow) {
            lastRead = result;
            latest.current.onNewText(result);
          }
          setState("dibacakan");
        }
      } catch (error) {
        console.warn("Mode Langsung:", error);
        lastFailAt = Date.now();
        lastSent = null;
        armed = true;
      } finally {
        sending = false;
      }
    };

    const tick = () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || sending) return next();
      setFrame((current) =>
        current.width === video.videoWidth && current.height === video.videoHeight
          ? current
          : { width: video.videoWidth, height: video.videoHeight }
      );
      setState((current) => (current === "menyiapkan" ? "mencari" : current));

      // 1. Diam dan tajam?
      const { context } = capture(small, video, LIVE_OCR.sampleWidth);
      if (!context) return next();
      const gray = toGray(context.getImageData(0, 0, small.width, small.height).data, small.width, small.height);
      const moved = motion(gray, previous);
      previous = gray;
      if (moved > LIVE_OCR.rearmAbove) {
        armed = true;
        setBoxes((current) => (current.length ? [] : current));
      }
      // Selama hasil dibacakan, gerakan tetap dipantau (pengguna boleh membalik halaman
      // sambil mendengarkan), tetapi belum ada yang dikirim
      if (latest.current.paused) {
        stillCount = 0;
        return next();
      }
      if (moved > LIVE_OCR.stillBelow) {
        stillCount = 0;
        setState((current) => (current === "dibacakan" || current === "kosong" ? current : "bergerak"));
        return next();
      }
      stillCount++;
      if (sharpness(gray, small.width, small.height) < LIVE_OCR.sharpAbove) {
        setState("buram");
        return next();
      }
      updateBoxes(video);
      if (stillCount < LIVE_OCR.stillTicks) return next();

      // 2. Pemandangan baru (habis digerakkan atau jelas berbeda) dan sudah boleh mengirim lagi?
      const changed = armed || motion(gray, lastSent) > LIVE_OCR.changedAbove;
      const ready = Date.now() - lastSentAt > SEND_EVERY_MS && Date.now() - lastFailAt > RETRY_AFTER_MS;
      if (!changed || !ready) return next();

      // 3. Hasil akhir dari OCR Gemini
      send(video, gray).finally(next);
    };

    setState("menyiapkan");
    loadWorker();
    timer = setTimeout(tick, TICK_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [enabled, videoRef]);

  return { state, preview, boxes, frame };
}
