import { useEffect, useRef, useState, type RefObject } from "react";
import { LIVE_OCR, motion, sharpness, textSimilarity, toGray, type LiveState } from "@/lib/liveOcr";

// Mode Langsung EyeRead. Kamera terus diperiksa beberapa kali per detik:
//   1. Di perangkat: apakah kamera diam dan gambarnya tajam (lib/liveOcr).
//   2. Di perangkat: Tesseract membaca frame sebagai pratinjau dan memberi kotak
//      di setiap kata. Tidak ada gambar yang dikirim pada tahap ini.
//   3. Bila pratinjau berisi cukup kata dan isinya berbeda dari halaman terakhir,
//      satu foto dikirim lewat onRead (OCR Gemini di server) untuk hasil akhir.

export type LiveBox = { x: number; y: number; w: number; h: number };

type Options = {
  videoRef: RefObject<HTMLVideoElement>;
  enabled: boolean;
  // Jeda pemeriksaan, misalnya selama hasil sedang dibacakan
  paused: boolean;
  // Mengirim foto ke OCR Gemini; mengembalikan teks atau null bila gagal
  onRead: (image: Blob) => Promise<string | null>;
};

type TesseractWorker = {
  recognize: (image: HTMLCanvasElement) => Promise<{ data: { words?: { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }[] } }>;
  terminate: () => Promise<void>;
};

const TICK_MS = 500;
// Tesseract paling sering sekali per 1,2 detik supaya ponsel tidak terlalu panas
const PREVIEW_EVERY_MS = 1200;
// Lebar frame untuk Tesseract: cukup untuk huruf buku, tetapi tetap cepat
const PREVIEW_WIDTH = 960;
// Setelah OCR Gemini gagal, coba lagi paling cepat sekian milidetik kemudian
const RETRY_AFTER_MS = 8000;

export function useLiveOcr({ videoRef, enabled, paused, onRead }: Options) {
  const [state, setState] = useState<LiveState | "menyiapkan">("menyiapkan");
  const [preview, setPreview] = useState("");
  const [boxes, setBoxes] = useState<LiveBox[]>([]);
  const [frame, setFrame] = useState({ width: 1280, height: 720 });

  const latest = useRef({ paused, onRead });
  latest.current = { paused, onRead };

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
    let stillCount = 0;
    let busy = false;
    let lastPreviewAt = 0;
    let lastRead = "";
    let lastFailAt = 0;

    const small = document.createElement("canvas");
    const big = document.createElement("canvas");

    const prepare = async () => {
      setState("menyiapkan");
      const Tesseract = (window as unknown as { Tesseract?: { createWorker: (lang: string) => Promise<TesseractWorker> } }).Tesseract;
      if (Tesseract) {
        try {
          // Data bahasa Indonesia diunduh sekali dari CDN Tesseract lalu disimpan browser
          worker = await Tesseract.createWorker("ind");
        } catch (error) {
          console.warn("Pengenal teks di perangkat gagal disiapkan:", error);
        }
      }
      if (cancelled) {
        worker?.terminate();
        return;
      }
      setState("mencari");
      timer = setTimeout(tick, TICK_MS);
    };

    const capture = (canvas: HTMLCanvasElement, video: HTMLVideoElement, width: number) => {
      const scale = width / video.videoWidth;
      canvas.width = width;
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);
      return { context, scale };
    };

    const tick = async () => {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth || latest.current.paused || busy) {
        timer = setTimeout(tick, TICK_MS);
        return;
      }
      setFrame((current) =>
        current.width === video.videoWidth && current.height === video.videoHeight
          ? current
          : { width: video.videoWidth, height: video.videoHeight }
      );

      // 1. Diam dan tajam?
      const { context } = capture(small, video, LIVE_OCR.sampleWidth);
      if (!context) {
        timer = setTimeout(tick, TICK_MS);
        return;
      }
      const pixels = context.getImageData(0, 0, small.width, small.height).data;
      const gray = toGray(pixels, small.width, small.height);
      const moved = motion(gray, previous);
      previous = gray;
      if (moved > LIVE_OCR.stillBelow) {
        stillCount = 0;
        setState((current) => (current === "dibacakan" ? current : "bergerak"));
        timer = setTimeout(tick, TICK_MS);
        return;
      }
      stillCount++;
      if (sharpness(gray, small.width, small.height) < LIVE_OCR.sharpAbove) {
        setState("buram");
        timer = setTimeout(tick, TICK_MS);
        return;
      }
      if (stillCount < 2 || Date.now() - lastPreviewAt < PREVIEW_EVERY_MS) {
        timer = setTimeout(tick, TICK_MS);
        return;
      }

      // 2. Pratinjau di perangkat
      busy = true;
      lastPreviewAt = Date.now();
      try {
        let text = "";
        let wordCount = 0;
        if (worker) {
          setState((current) => (current === "terdeteksi" ? current : "membaca"));
          const { scale } = capture(big, video, Math.min(PREVIEW_WIDTH, video.videoWidth));
          const { data } = await worker.recognize(big);
          if (cancelled) return;
          const found = (data.words ?? []).filter((word) => word.confidence >= 60 && word.text.trim().length >= 2);
          wordCount = found.length;
          text = found.map((word) => word.text).join(" ");
          setBoxes(
            found.map(({ bbox }) => ({
              x: bbox.x0 / scale,
              y: bbox.y0 / scale,
              w: (bbox.x1 - bbox.x0) / scale,
              h: (bbox.y1 - bbox.y0) / scale,
            }))
          );
          setPreview(text);
        }

        // Tanpa Tesseract (gagal dimuat), gambar yang diam dan tajam langsung dikirim sekali
        const enoughText = worker ? wordCount >= LIVE_OCR.minWords : lastRead === "";
        if (!enoughText) {
          setState("mencari");
          return;
        }
        const isNew = textSimilarity(text, lastRead) < LIVE_OCR.newBelow || (!worker && lastRead === "");
        const canRetry = Date.now() - lastFailAt > RETRY_AFTER_MS;
        if (!isNew || !canRetry) {
          setState((current) => (current === "dibacakan" ? current : "terdeteksi"));
          return;
        }

        // 3. Hasil akhir dari OCR Gemini
        setState("mengirim");
        const full = document.createElement("canvas");
        capture(full, video, video.videoWidth);
        const blob = await new Promise<Blob | null>((resolve) => full.toBlob(resolve, "image/jpeg", 0.9));
        if (!blob || cancelled) return;
        const result = await latest.current.onRead(blob);
        if (cancelled) return;
        if (result) {
          lastRead = text || result;
          setState("dibacakan");
        } else {
          lastFailAt = Date.now();
          setState("terdeteksi");
        }
      } catch (error) {
        console.warn("Mode Langsung:", error);
      } finally {
        busy = false;
        if (!cancelled) timer = setTimeout(tick, TICK_MS);
      }
    };

    prepare();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      worker?.terminate();
    };
  }, [enabled, videoRef]);

  return { state, preview, boxes, frame };
}
