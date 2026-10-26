// Pengenalan kata BISINDO dari gerakan dua tangan. Harus identik dengan
// ml/bisindo/bisindo_features.py dan ml/bisindo/train.py; bisindo.test.ts
// memeriksanya dengan contoh dari models/bisindo-kata.samples.json.
//
// Per frame (titik dalam piksel): pusat = tengah kedua bahu, skala = jarak
// bahu. Tiap tangan masuk slot menurut pergelangan tubuh terdekat (titik 15
// dan 16). Isi tiap slot: penanda ada lalu 21 titik (x, y, z); ditambah titik
// tubuh 0 dan 11–16 (x, y). Satu isyarat = frame dari tangan pertama sampai
// tangan terakhir terlihat, disamakan menjadi 30 frame menurut waktu.

import type { Point } from "./landmarks";

export const FRAMES = 30;
export const POSE_POINTS = [0, 11, 12, 13, 14, 15, 16];
export const HAND_SIZE = 1 + 21 * 3;
export const FEATURE_SIZE = 2 * HAND_SIZE + POSE_POINTS.length * 2;
export const MIN_FRAMES = 6;
// Tangan hilang selama ini = isyarat selesai
export const GAP_MS = 400;
// Isyarat lebih lama dari ini dianggap bukan satu kata (tangan dibiarkan terangkat)
export const MAX_SIGN_MS = 6000;

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export const frameFeatures = (hands: Point[][], pose: Point[] | null): number[] | null => {
  if (!pose || pose.length < 17) return null;
  const left = pose[11];
  const right = pose[12];
  const ox = (left.x + right.x) / 2;
  const oy = (left.y + right.y) / 2;
  const scale = Math.hypot(left.x - right.x, left.y - right.y);
  if (scale < 1e-6) return null;

  let slots: (Point[] | null)[] = [null, null];
  const wrists = [pose[15], pose[16]];
  if (hands.length === 1) {
    const slot = distance(hands[0][0], wrists[0]) <= distance(hands[0][0], wrists[1]) ? 0 : 1;
    slots[slot] = hands[0];
  } else if (hands.length >= 2) {
    const [a, b] = hands;
    const straight = distance(a[0], wrists[0]) + distance(b[0], wrists[1]);
    const swapped = distance(a[0], wrists[1]) + distance(b[0], wrists[0]);
    slots = straight <= swapped ? [a, b] : [b, a];
  }

  const out: number[] = [];
  for (const hand of slots) {
    if (!hand) {
      for (let i = 0; i < HAND_SIZE; i++) out.push(0);
      continue;
    }
    out.push(1);
    for (const p of hand) out.push((p.x - ox) / scale, (p.y - oy) / scale, p.z / scale);
  }
  for (const i of POSE_POINTS) out.push((pose[i].x - ox) / scale, (pose[i].y - oy) / scale);
  return out;
};

// Menyamakan urutan frame menjadi `frames` frame, berjarak waktu sama
export const resample = (features: number[][], times: number[], frames = FRAMES): number[][] => {
  if (features.length === 1) return Array.from({ length: frames }, () => features[0].slice());
  const first = times[0];
  const last = times[times.length - 1];
  const out: number[][] = [];
  let j = 0;
  for (let k = 0; k < frames; k++) {
    const t = first + ((last - first) * k) / (frames - 1);
    while (j < times.length - 2 && times[j + 1] < t) j++;
    const span = times[j + 1] - times[j];
    const w = span <= 0 ? 0 : Math.min(1, Math.max(0, (t - times[j]) / span));
    const a = features[j];
    const b = features[j + 1];
    out.push(a.map((value, i) => value * (1 - w) + b[i] * w));
  }
  return out;
};

// Titik mentah satu frame dalam piksel, format yang sama dengan extract.py
export type RawFrame = { t: number; hands: Point[][]; pose: Point[] };

export type SegmentEvent =
  | { type: "sign"; sequence: number[][]; frames: RawFrame[]; durationMs: number }
  | { type: "too-long" }
  | null;

// Memotong aliran frame kamera menjadi satu isyarat per kata: mulai saat
// tangan (dan bahu) terlihat, selesai saat tangan diturunkan selama GAP_MS.
// Frame tanpa tangan di tengah isyarat dilewati dan diisi interpolasi.
export class SignSegmenter {
  private frames: (RawFrame & { features: number[] })[] = [];
  private tooLong = false;

  get signing() {
    return this.frames.length > 0;
  }

  reset() {
    this.frames = [];
    this.tooLong = false;
  }

  // Dipanggil tiap frame dengan titik dalam piksel. Mengembalikan isyarat
  // lengkap pada frame saat isyarat dianggap selesai.
  push(hands: Point[][], pose: Point[] | null, now: number): SegmentEvent {
    const features = hands.length > 0 ? frameFeatures(hands, pose) : null;
    const lastHandAt = this.frames.length ? this.frames[this.frames.length - 1].t : -Infinity;
    const gap = this.frames.length > 0 && now - lastHandAt > GAP_MS;

    if (features && !gap) {
      this.frames.push({ t: now, hands, pose: pose!, features });
      if (!this.tooLong && now - this.frames[0].t > MAX_SIGN_MS) {
        this.tooLong = true;
        return { type: "too-long" };
      }
      return null;
    }
    if (!gap) return null;

    // Isyarat selesai. Bila frame ini sudah bertangan lagi (kamera sempat
    // tersendat), frame ini menjadi awal isyarat berikutnya.
    const event = this.finish();
    if (features) this.frames.push({ t: now, hands, pose: pose!, features });
    return event;
  }

  private finish(): SegmentEvent {
    const segment = this.frames;
    const tooLong = this.tooLong;
    this.reset();
    if (tooLong || segment.length < MIN_FRAMES) return null;
    return {
      type: "sign",
      sequence: resample(
        segment.map((f) => f.features),
        segment.map((f) => f.t)
      ),
      frames: segment.map(({ t, hands: h, pose: p }) => ({ t, hands: h, pose: p })),
      durationMs: segment[segment.length - 1].t - segment[0].t,
    };
  }
}

// --- Model urutan (format dari ml/bisindo/train.py) ---

type Activation = "relu" | "softmax" | "linear";
type WordLayer =
  | { type: "conv1d"; W: number[][][]; b: number[]; activation: Activation }
  | { type: "globalavgpool" }
  | { type: "dense"; W: number[][]; b: number[]; activation: Activation };

export type WordModel = {
  kind: "sequence";
  labels: string[];
  frames: number;
  feature_size: number;
  mean: number[];
  std: number[];
  layers: WordLayer[];
};

const activate = (values: number[], activation: Activation) => {
  if (activation === "relu") return values.map((v) => (v > 0 ? v : 0));
  if (activation === "softmax") {
    const max = Math.max(...values);
    const exp = values.map((v) => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map((v) => v / sum);
  }
  return values;
};

// Konvolusi 1D dengan padding "same": keluaran[t] = b + Σj masukan[t + j - pad] · W[j]
const conv1d = (input: number[][], layer: Extract<WordLayer, { type: "conv1d" }>) => {
  const k = layer.W.length;
  const pad = Math.floor((k - 1) / 2);
  const outSize = layer.b.length;
  return input.map((_, t) => {
    const out = layer.b.slice();
    for (let j = 0; j < k; j++) {
      const row = input[t + j - pad];
      if (!row) continue;
      const W = layer.W[j];
      for (let i = 0; i < row.length; i++) {
        const value = row[i];
        if (value === 0) continue;
        const weights = W[i];
        for (let o = 0; o < outSize; o++) out[o] += value * weights[o];
      }
    }
    return activate(out, layer.activation);
  });
};

const dense = (input: number[], layer: Extract<WordLayer, { type: "dense" }>) => {
  const out = layer.b.slice();
  for (let i = 0; i < input.length; i++) {
    const value = input[i];
    if (value === 0) continue;
    const row = layer.W[i];
    for (let o = 0; o < out.length; o++) out[o] += value * row[o];
  }
  return activate(out, layer.activation);
};

// Mengembalikan peluang tiap kata, urut sesuai model.labels
export const wordProbabilities = (model: WordModel, sequence: number[][]): number[] => {
  let frames = sequence.map((row) => row.map((v, i) => (v - model.mean[i]) / model.std[i]));
  let vector: number[] | null = null;
  for (const layer of model.layers) {
    if (layer.type === "conv1d") frames = conv1d(frames, layer);
    else if (layer.type === "globalavgpool")
      vector = frames[0].map((_, i) => frames.reduce((sum, row) => sum + row[i], 0) / frames.length);
    else vector = dense(vector ?? frames[frames.length - 1], layer);
  }
  return vector ?? [];
};

export type RankedWord = { label: string; confidence: number };
// label dan confidence: tebakan teratas. ranked: tiga tebakan teratas, urut dari peluang terbesar.
export type WordPrediction = RankedWord & { ranked: RankedWord[] };

export const predictWord = (model: WordModel, sequence: number[][]): WordPrediction => {
  const probs = wordProbabilities(model, sequence);
  const ranked = model.labels
    .map((label, i) => ({ label, confidence: probs[i] }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
  return { ...ranked[0], ranked };
};

// Saat latihan, kata yang diminta sudah diketahui, jadi cukup diperiksa apakah gerakan
// cocok dengan kata itu: target ada di tiga tebakan teratas dengan peluang yang cukup.
// Kata yang mirip (Pagi/Siang/Sore, Apa/Dimana/Cari) tidak lagi membuat latihan gagal,
// sedangkan isyarat yang jelas berbeda tetap ditolak karena peluang targetnya kecil.
export const TARGET_MIN_CONFIDENCE = 0.12;

export const matchesTarget = (prediction: WordPrediction | null, target: string) =>
  !!prediction &&
  prediction.ranked.some((word) => word.label === target && word.confidence >= TARGET_MIN_CONFIDENCE);

const isWordModel = (value: unknown): value is WordModel => {
  const model = value as Partial<WordModel> | null;
  return (
    model?.kind === "sequence" &&
    Array.isArray(model.labels) &&
    Array.isArray(model.layers) &&
    model.feature_size === FEATURE_SIZE &&
    model.mean?.length === FEATURE_SIZE &&
    model.std?.length === FEATURE_SIZE
  );
};

// Mengembalikan null bila model belum dipasang atau formatnya tidak dikenali
export const loadWordModel = async (url: string): Promise<WordModel | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok || !response.headers.get("content-type")?.includes("json")) return null;
    const data = await response.json();
    if (!isWordModel(data)) {
      console.error("Format model kata BISINDO tidak dikenali:", url);
      return null;
    }
    return data;
  } catch {
    return null;
  }
};
