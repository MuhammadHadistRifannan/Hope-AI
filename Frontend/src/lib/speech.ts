import { API_URL, authHeaders } from "@/lib/api";
import { applyIndonesianVoice } from "@/lib/voice";
import { announceCaption } from "@/lib/cues";

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
  // Tanggapan singkat aplikasi (bukan isi materi). Tidak disuarakan dalam Mode
  // Pembaca Layar agar tidak bertumpuk dengan suara VoiceOver, TalkBack, atau NVDA.
  feedback?: boolean;
  // Posisi baca 0..1 terhadap seluruh teks, untuk menyorot kata yang sedang diucapkan.
  // Dari suara perangkat dipakai posisi kata asli bila tersedia; selain itu diperkirakan dari waktu.
  onProgress?: (fraction: number) => void;
};

// Bagian teks yang sedang diucapkan: mulai di karakter `offset` dari `total`
type Span = { offset: number; total: number };

// Perkiraan kecepatan bicara untuk menyorot kata bila tidak ada posisi kata asli
const CHARS_PER_SECOND = 14;

let muteFeedback = false;
// Dipanggil dari pengaturan saat Mode Pembaca Layar berubah
export const setSpeechPreferences = (prefs: { muteFeedback: boolean }) => {
  muteFeedback = prefs.muteFeedback;
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

// true selama aplikasi sedang bersuara (dipakai mode dengar terus agar tidak
// mendengarkan suaranya sendiri)
export const isSpeaking = () =>
  (currentAudio !== null && !currentAudio.paused) ||
  (typeof window !== "undefined" && "speechSynthesis" in window && window.speechSynthesis.speaking);

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

const playAudio = (url: string, options: SpeakOptions, id: number, span: Span, length: number) =>
  new Promise<void>((resolve, reject) => {
    if (id !== playId) return resolve();
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, options.volume / 100));
    audio.playbackRate = rateValue(options.rate);
    if (options.onProgress) {
      audio.ontimeupdate = () => {
        if (id !== playId || !audio.duration) return;
        options.onProgress!((span.offset + (audio.currentTime / audio.duration) * length) / span.total);
      };
    }
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error("Audio gagal diputar"));
    currentAudio = audio;
    audio.play().catch(reject);
  });

const speakWithDevice = (text: string, options: SpeakOptions, id: number, span?: Span) =>
  new Promise<void>((resolve) => {
    if (id !== playId || !("speechSynthesis" in window)) return resolve();
    const utterance = new SpeechSynthesisUtterance(text);
    applyIndonesianVoice(utterance);
    utterance.volume = options.volume / 100;
    utterance.rate = options.rate === "slow" ? 0.8 : options.rate === "fast" ? 1.2 : 1.0;

    let ticker: ReturnType<typeof setInterval> | undefined;
    const where = span ?? { offset: 0, total: text.length };
    if (options.onProgress) {
      let hasBoundary = false;
      const startedAt = Date.now();
      // Posisi kata asli (Safari dan suara lokal); suara jaringan Chrome tidak mengirimnya
      utterance.onboundary = (event) => {
        if (event.name !== "word" || id !== playId) return;
        hasBoundary = true;
        options.onProgress!((where.offset + event.charIndex) / where.total);
      };
      ticker = setInterval(() => {
        if (hasBoundary || id !== playId) return;
        const spoken = ((Date.now() - startedAt) / 1000) * CHARS_PER_SECOND * utterance.rate;
        options.onProgress!((where.offset + Math.min(spoken, text.length)) / where.total);
      }, 200);
    }
    const done = () => {
      clearInterval(ticker);
      resolve();
    };
    utterance.onend = done;
    utterance.onerror = done;
    window.speechSynthesis.speak(utterance);
  });

export const speak = async (text: string, options: SpeakOptions) => {
  stopSpeech();
  const id = playId;
  const clean = text.trim();
  if (!clean) return;

  // Semua yang diucapkan juga dikirim sebagai teks (caption dan pembaca layar)
  announceCaption(clean);
  if (options.feedback && muteFeedback) return;

  options.onStart?.();

  try {
    if (!options.aiVoice) {
      await speakWithDevice(clean, options, id);
      return;
    }

    const chunks = splitIntoChunks(clean);
    const total = chunks.reduce((sum, chunk) => sum + chunk.length + 1, 0);
    // Posisi awal tiap potongan di seluruh teks
    const offsets = chunks.map((_, i) => chunks.slice(0, i).reduce((sum, chunk) => sum + chunk.length + 1, 0));
    let next: Promise<string> | null = fetchAiAudio(chunks[0]);

    for (let i = 0; i < chunks.length; i++) {
      if (id !== playId) return;

      let url: string;
      try {
        url = await next!;
      } catch (error) {
        // Suara AI tidak tersedia: lanjutkan sisanya dengan suara perangkat
        console.warn("Suara AI tidak tersedia, memakai suara perangkat:", error);
        await speakWithDevice(chunks.slice(i).join(" "), options, id, { offset: offsets[i], total });
        return;
      }

      // Siapkan potongan berikutnya selagi yang ini diputar
      next = i + 1 < chunks.length ? fetchAiAudio(chunks[i + 1]) : null;
      next?.catch(() => undefined);

      try {
        await playAudio(url, options, id, { offset: offsets[i], total }, chunks[i].length);
      } catch (error) {
        console.warn("Audio AI gagal diputar, memakai suara perangkat:", error);
        await speakWithDevice(chunks.slice(i).join(" "), options, id, { offset: offsets[i], total });
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
