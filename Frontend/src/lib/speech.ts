import { API_URL, authHeaders } from "@/lib/api";
import { applyIndonesianVoice } from "@/lib/voice";

// Membacakan teks. Bila suara AI aktif, audio diambil dari server (Gemini TTS)
// potongan demi potongan; kalau server gagal atau kuotanya habis, sisa teks
// dibacakan dengan suara bawaan perangkat supaya pengguna tidak pernah dibiarkan diam.

export type SpeechRate = "slow" | "normal" | "fast";

type SpeakOptions = {
  volume: number; // 0 - 100
  rate: SpeechRate | string;
  aiVoice: boolean;
  onStart?: () => void;
  onEnd?: () => void;
};

// Potongan pendek membuat audio pertama cepat siap
const CHUNK_LENGTH = 500;
const AI_TIMEOUT_MS = 45000;

let playId = 0;
let currentAudio: HTMLAudioElement | null = null;
const audioCache = new Map<string, string>();

const rateValue = (rate: string) => (rate === "slow" ? 0.85 : rate === "fast" ? 1.2 : 1.0);

export const splitIntoChunks = (text: string, maxLength = CHUNK_LENGTH): string[] => {
  const sentences = text.replace(/\s+/g, " ").trim().match(/[^.!?\n]+[.!?]*\s*/g) ?? [];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    if (current && (current + sentence).length > maxLength) {
      chunks.push(current.trim());
      current = "";
    }
    // Kalimat yang lebih panjang dari batas dipotong per kata
    if (sentence.length > maxLength) {
      for (const word of sentence.split(" ")) {
        if ((current + " " + word).length > maxLength) {
          chunks.push(current.trim());
          current = "";
        }
        current += (current ? " " : "") + word;
      }
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

export const stopSpeech = () => {
  playId++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
};

const fetchAiAudio = async (chunk: string): Promise<string> => {
  const cached = audioCache.get(chunk);
  if (cached) return cached;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${API_URL}/gemini/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ text: chunk }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`TTS ${response.status}`);

    const url = URL.createObjectURL(await response.blob());
    audioCache.set(chunk, url);
    return url;
  } finally {
    clearTimeout(timer);
  }
};

const playAudio = (url: string, options: SpeakOptions, id: number) =>
  new Promise<void>((resolve, reject) => {
    if (id !== playId) return resolve();
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, options.volume / 100));
    audio.playbackRate = rateValue(options.rate);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio gagal diputar"));
    currentAudio = audio;
    audio.play().catch(reject);
  });

const speakWithDevice = (text: string, options: SpeakOptions, id: number) =>
  new Promise<void>((resolve) => {
    if (id !== playId || !("speechSynthesis" in window)) return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    applyIndonesianVoice(utterance);
    utterance.volume = options.volume / 100;
    utterance.rate = options.rate === "slow" ? 0.8 : options.rate === "fast" ? 1.2 : 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });

export const speak = async (text: string, options: SpeakOptions) => {
  stopSpeech();
  const id = playId;
  const clean = text.trim();
  if (!clean) return;

  options.onStart?.();

  try {
    if (!options.aiVoice) {
      await speakWithDevice(clean, options, id);
      return;
    }

    const chunks = splitIntoChunks(clean);
    let next: Promise<string> | null = fetchAiAudio(chunks[0]);

    for (let i = 0; i < chunks.length; i++) {
      if (id !== playId) return;

      let url: string;
      try {
        url = await next!;
      } catch (error) {
        // Suara AI tidak tersedia: lanjutkan sisanya dengan suara perangkat
        console.warn("Suara AI tidak tersedia, memakai suara perangkat:", error);
        await speakWithDevice(chunks.slice(i).join(" "), options, id);
        return;
      }

      // Siapkan potongan berikutnya selagi yang ini diputar
      next = i + 1 < chunks.length ? fetchAiAudio(chunks[i + 1]) : null;
      next?.catch(() => undefined);

      try {
        await playAudio(url, options, id);
      } catch (error) {
        console.warn("Audio AI gagal diputar, memakai suara perangkat:", error);
        await speakWithDevice(chunks.slice(i).join(" "), options, id);
        return;
      }
    }
  } finally {
    if (id === playId) {
      currentAudio = null;
      options.onEnd?.();
    }
  }
};
