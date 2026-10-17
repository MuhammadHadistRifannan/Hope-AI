// Mode Otomatis (eksperimen): satu kamera, dua model yang tetap terpisah.
// SIBI dan BISINDO adalah sistem berbeda, jadi modelnya tidak digabung;
// router ini hanya memilih hasil model mana yang ditampilkan, dan setiap
// hasil selalu membawa nama sistemnya.
//
// Aturan:
//   - Satu tangan diam selama letterHoldMs dan model SIBI yakin → huruf SIBI.
//     Huruf berikutnya boleh menyusul tanpa menurunkan tangan (mengeja nama).
//   - Selain itu, isyarat dibaca model BISINDO setelah tangan diturunkan →
//     kata BISINDO, atau "belum yakin" bila peluangnya di bawah ambang.
//   - Bila dalam satu kali angkat tangan sudah ada huruf, gerakan itu dianggap
//     ejaan dan tidak dibaca lagi sebagai kata.
//   - Sistem yang diutamakan pengguna mendapat ambang lebih ringan, jadi saat
//     ragu router condong ke sistem itu.

import { GAP_MS, SignSegmenter, type RawFrame, type WordPrediction } from "./bisindo";
import type { Prediction } from "./classifier";
import type { Point } from "./landmarks";
import { Stabilizer, type StabilizerState } from "./stabilizer";

export type SignSystem = "sibi" | "bisindo";

export const SYSTEM_NAME: Record<SignSystem, string> = { sibi: "SIBI", bisindo: "BISINDO" };

export type RouterConfig = {
  letterHoldMs: number; // lama huruf yang sama ditahan, dihitung setelah tangan terbaca diam
  letterMinConfidence: number; // ambang keyakinan model SIBI
  wordMinConfidence: number; // ambang keyakinan model BISINDO
  stillWindowMs: number; // rentang waktu untuk menilai tangan diam
  stillMotion: number; // gerak pergelangan maksimal di rentang itu, dalam satuan ukuran tangan
  releaseMs: number; // jeda sebelum huruf yang sama boleh diterima lagi
};

// Ambang per sistem yang diutamakan. Angka ini belum disetel dengan peraga
// sungguhan; batas paling rawan adalah isyarat menunjuk (Saya, Kamu, Dimana)
// yang mirip huruf SIBI bila tangan berhenti sejenak.
export const ROUTER_CONFIG: Record<SignSystem, RouterConfig> = {
  sibi: {
    letterHoldMs: 500,
    letterMinConfidence: 0.7,
    wordMinConfidence: 0.7,
    stillWindowMs: 300,
    stillMotion: 0.25,
    releaseMs: 350,
  },
  bisindo: {
    letterHoldMs: 800,
    letterMinConfidence: 0.85,
    wordMinConfidence: 0.6,
    stillWindowMs: 300,
    stillMotion: 0.25,
    releaseMs: 350,
  },
};

export type RouterEvent =
  | { type: "letter"; system: "sibi"; label: string; confidence: number }
  | { type: "word"; system: "bisindo"; label: string; confidence: number; frames: RawFrame[] }
  | { type: "unsure"; system: "bisindo"; label: string; confidence: number };

export type RouterLive = {
  hands: number;
  still: boolean;
  letterState: StabilizerState;
  letterProgress: number;
  signing: boolean; // gerakan sedang direkam untuk model BISINDO
  spelling: boolean; // sudah ada huruf sejak tangan diangkat
};

type WristSample = { t: number; x: number; y: number };

export class SignRouter {
  private segmenter = new SignSegmenter();
  private stabilizer: Stabilizer;
  private wrist: WristSample[] = [];
  private lastHandAt = -Infinity;
  private spelled = false;
  private still = false;
  private hands = 0;

  constructor(
    private predictWord: (sequence: number[][]) => WordPrediction | null,
    private config: RouterConfig = ROUTER_CONFIG.sibi
  ) {
    this.stabilizer = new Stabilizer({
      minConfidence: config.letterMinConfidence,
      holdMs: config.letterHoldMs,
      releaseMs: config.releaseMs,
    });
  }

  get live(): RouterLive {
    return {
      hands: this.hands,
      still: this.still,
      letterState: this.stabilizer.state,
      letterProgress: this.stabilizer.progress,
      signing: this.segmenter.signing,
      spelling: this.spelled,
    };
  }

  reset() {
    this.segmenter.reset();
    this.stabilizer.reset();
    this.wrist = [];
    this.lastHandAt = -Infinity;
    this.spelled = false;
    this.still = false;
    this.hands = 0;
  }

  // Dipanggil tiap frame. hands dan pose dalam piksel; letter = tebakan model
  // SIBI untuk tangan pertama (null bila tidak dihitung).
  push(hands: Point[][], pose: Point[] | null, letter: Prediction | null, now: number): RouterEvent[] {
    const events: RouterEvent[] = [];
    const handsWereDown = now - this.lastHandAt > GAP_MS;

    const segment = this.segmenter.push(hands, pose, now);
    if (segment?.type === "sign" && !this.spelled) {
      const word = this.predictWord(segment.sequence);
      if (word && word.confidence >= this.config.wordMinConfidence) {
        events.push({ type: "word", system: "bisindo", ...word, frames: segment.frames });
      } else if (word) {
        events.push({ type: "unsure", system: "bisindo", ...word });
      }
    }

    // Tangan sempat turun: ejaan sebelumnya selesai
    if (handsWereDown) this.spelled = false;
    if (hands.length > 0) this.lastHandAt = now;
    this.hands = hands.length;
    this.trackWrist(hands, now);

    const eligible = hands.length === 1 && this.still && letter !== null;
    const accepted = this.stabilizer.push(eligible ? letter.label : null, eligible ? letter.confidence : 0, now);
    if (accepted && letter) {
      this.spelled = true;
      events.push({ type: "letter", system: "sibi", label: accepted, confidence: letter.confidence });
    }
    return events;
  }

  // Tangan dianggap diam bila pergelangan hampir tidak bergeser selama
  // stillWindowMs, diukur relatif terhadap ukuran tangan (titik 0 ke 9)
  private trackWrist(hands: Point[][], now: number) {
    if (hands.length !== 1) {
      this.wrist = [];
      this.still = false;
      return;
    }
    const hand = hands[0];
    const size = Math.hypot(hand[9].x - hand[0].x, hand[9].y - hand[0].y);
    if (size < 1e-6) {
      this.still = false;
      return;
    }
    const { stillWindowMs, stillMotion } = this.config;
    this.wrist.push({ t: now, x: hand[0].x / size, y: hand[0].y / size });
    while (this.wrist.length > 1 && now - this.wrist[1].t >= stillWindowMs) this.wrist.shift();

    const first = this.wrist[0];
    const latest = this.wrist[this.wrist.length - 1];
    const covered = now - first.t >= stillWindowMs * 0.8;
    const moved = Math.max(...this.wrist.map((p) => Math.hypot(p.x - latest.x, p.y - latest.y)));
    this.still = covered && moved <= stillMotion;
  }
}

// --- Teks hasil mode Otomatis ---

// Huruf yang berurutan digabung menjadi satu ejaan; tiap bagian tetap
// membawa sistemnya supaya bisa ditampilkan "Halo (BISINDO)", "RAFI (SIBI)".
export type TranscriptPart = { system: SignSystem; text: string; open: boolean };

export const appendToTranscript = (parts: TranscriptPart[], event: RouterEvent): TranscriptPart[] => {
  if (event.type === "unsure") return parts;
  const last = parts[parts.length - 1];
  if (event.type === "letter") {
    if (last?.system === "sibi" && last.open) {
      return [...parts.slice(0, -1), { ...last, text: last.text + event.label }];
    }
    return [...parts, { system: "sibi", text: event.label, open: true }];
  }
  return [...closeSpelling(parts), { system: "bisindo", text: event.label, open: false }];
};

// Mengakhiri ejaan yang sedang berjalan (tombol Spasi)
export const closeSpelling = (parts: TranscriptPart[]): TranscriptPart[] =>
  parts.map((part) => (part.open ? { ...part, open: false } : part));

// Hapus satu huruf dari ejaan terakhir, atau satu kata BISINDO
export const removeLast = (parts: TranscriptPart[]): TranscriptPart[] => {
  const last = parts[parts.length - 1];
  if (!last) return parts;
  if (last.system === "sibi" && last.text.length > 1) {
    return [...parts.slice(0, -1), { ...last, text: last.text.slice(0, -1) }];
  }
  return parts.slice(0, -1);
};

// Kalimat untuk diucapkan: ejaan dibaca sebagai kata, bukan huruf demi huruf
export const transcriptText = (parts: TranscriptPart[]) => parts.map((part) => part.text.toLowerCase()).join(" ");
