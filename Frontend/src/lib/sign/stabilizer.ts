// Menyaring tebakan per frame menjadi isyarat yang benar-benar diterima.
// Satu frame tidak dipercaya: sebuah isyarat baru diterima bila tebakannya
// cukup yakin DAN bertahan selama waktu tertentu. Setelah diterima, isyarat
// yang sama tidak diterima lagi sampai tangan berubah bentuk atau diturunkan,
// sehingga menahan satu huruf tidak menghasilkan huruf berulang.

export type StabilizerOptions = {
  minConfidence: number; // tebakan di bawah nilai ini diabaikan
  holdMs: number; // lama isyarat harus bertahan sebelum diterima
  releaseMs: number; // jeda tanpa isyarat itu sebelum boleh diterima lagi
};

export const defaultStabilizerOptions: StabilizerOptions = {
  minConfidence: 0.7,
  holdMs: 700,
  releaseMs: 350,
};

export type StabilizerState = "idle" | "unsure" | "holding" | "accepted";

export class Stabilizer {
  private candidate: string | null = null;
  private candidateSince = 0;
  private lastAccepted: string | null = null;
  private lastSeenAccepted = 0;
  state: StabilizerState = "idle";
  // 0 sampai 1: seberapa jauh kandidat saat ini menuju diterima
  progress = 0;

  constructor(private options: StabilizerOptions = defaultStabilizerOptions) {}

  reset() {
    this.candidate = null;
    this.lastAccepted = null;
    this.state = "idle";
    this.progress = 0;
  }

  // Dipanggil tiap frame. label null berarti tidak ada tangan terlihat.
  // Mengembalikan label hanya pada frame saat isyarat diterima.
  push(label: string | null, confidence: number, now: number): string | null {
    const { minConfidence, holdMs, releaseMs } = this.options;
    const confident = label !== null && confidence >= minConfidence;

    // Isyarat yang baru diterima boleh diterima lagi setelah dilepas sejenak
    if (this.lastAccepted !== null) {
      if (confident && label === this.lastAccepted) {
        this.lastSeenAccepted = now;
      } else if (now - this.lastSeenAccepted >= releaseMs) {
        this.lastAccepted = null;
      }
    }

    if (!confident) {
      this.candidate = null;
      this.progress = 0;
      this.state = label === null ? "idle" : "unsure";
      return null;
    }

    if (label === this.lastAccepted) {
      this.candidate = null;
      this.progress = 1;
      this.state = "accepted";
      return null;
    }

    if (label !== this.candidate) {
      this.candidate = label;
      this.candidateSince = now;
    }

    const held = now - this.candidateSince;
    this.progress = Math.min(1, held / holdMs);
    this.state = "holding";

    if (held >= holdMs) {
      this.lastAccepted = label;
      this.lastSeenAccepted = now;
      this.candidate = null;
      this.state = "accepted";
      this.progress = 1;
      return label;
    }
    return null;
  }
}
