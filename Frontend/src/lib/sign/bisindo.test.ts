import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Point } from "./landmarks";
import {
  FEATURE_SIZE, FRAMES, GAP_MS, MAX_SIGN_MS, SignSegmenter, frameFeatures, predictWord, resample, wordProbabilities,
  type WordModel,
} from "./bisindo";
import { BISINDO_SIMILAR, BISINDO_WORDS } from "./bisindoWords";

// Tubuh tegak menghadap kamera: bahu di (300, 200) dan (200, 200), pergelangan di bawahnya
const pose = (): Point[] => {
  const points = Array.from({ length: 33 }, () => ({ x: 250, y: 300, z: 0 }));
  points[0] = { x: 250, y: 120, z: 0 };
  points[11] = { x: 300, y: 200, z: 0 };
  points[12] = { x: 200, y: 200, z: 0 };
  points[15] = { x: 320, y: 300, z: 0 };
  points[16] = { x: 180, y: 300, z: 0 };
  return points;
};
const hand = (x: number, y: number): Point[] => Array.from({ length: 21 }, (_, i) => ({ x: x + i, y: y - i, z: i * 2 }));

describe("frameFeatures", () => {
  it("berukuran 142 dan memakai bahu sebagai pusat dan skala", () => {
    const features = frameFeatures([hand(250, 200)], pose())!;
    expect(features).toHaveLength(FEATURE_SIZE);
    // Satu tangan di tengah dada: masuk salah satu slot, titik pertamanya di pusat
    const slot = features[0] === 1 ? 0 : 64;
    expect(features[slot + 1]).toBeCloseTo(0, 6);
    expect(features[slot + 2]).toBeCloseTo(0, 6);
    expect(features[slot + 3 * 9 + 1]).toBeCloseTo(9 / 100, 6);
  });

  it("menaruh tangan di slot sesuai pergelangan tubuh terdekat, apa pun urutan dari MediaPipe", () => {
    const a = frameFeatures([hand(320, 300), hand(180, 300)], pose())!;
    const b = frameFeatures([hand(180, 300), hand(320, 300)], pose())!;
    expect(b).toEqual(a);
    expect(a[1]).toBeCloseTo((320 - 250) / 100, 6);
    expect(a[65]).toBeCloseTo((180 - 250) / 100, 6);
  });

  it("menolak frame tanpa tubuh", () => {
    expect(frameFeatures([hand(250, 200)], null)).toBeNull();
  });
});

describe("resample", () => {
  it("menyamakan panjang menurut waktu, bukan urutan frame", () => {
    const out = resample([[0], [10], [20]], [0, 100, 1000], 4);
    // t = 0, 333, 667, 1000 ms; di antara 100 dan 1000 ms nilainya naik 10 per 900 ms
    expect(out.map((row) => row[0])).toEqual([0, expect.closeTo(12.59, 2), expect.closeTo(16.3, 2), 20]);
  });
});

describe("SignSegmenter", () => {
  const feed = (segmenter: SignSegmenter, from: number, to: number, withHand: boolean, step = 33) => {
    const events = [];
    for (let t = from; t <= to; t += step) {
      const event = segmenter.push(withHand ? [hand(320, 300)] : [], withHand ? pose() : null, t);
      if (event) events.push(event);
    }
    return events;
  };

  it("mengeluarkan satu isyarat setelah tangan diturunkan", () => {
    const segmenter = new SignSegmenter();
    expect(feed(segmenter, 0, 1000, true)).toEqual([]);
    expect(segmenter.signing).toBe(true);
    const [event] = feed(segmenter, 1033, 1033 + GAP_MS + 100, false);
    expect(event?.type).toBe("sign");
    if (event?.type === "sign") {
      expect(event.sequence).toHaveLength(FRAMES);
      expect(event.frames.length).toBeGreaterThan(20);
    }
    expect(segmenter.signing).toBe(false);
  });

  it("tidak memotong isyarat bila tangan hilang sesaat", () => {
    const segmenter = new SignSegmenter();
    feed(segmenter, 0, 500, true);
    expect(feed(segmenter, 533, 533 + GAP_MS - 100, false)).toEqual([]);
    expect(segmenter.signing).toBe(true);
  });

  it("menolak tangan yang dibiarkan terangkat terlalu lama", () => {
    const segmenter = new SignSegmenter();
    const events = feed(segmenter, 0, MAX_SIGN_MS + 500, true);
    expect(events).toEqual([{ type: "too-long" }]);
    expect(feed(segmenter, MAX_SIGN_MS + 533, MAX_SIGN_MS + 1500, false)).toEqual([]);
  });
});

// Memastikan pemotongan, fitur, dan model di browser sama dengan Python:
// titik mentah video uji dijalankan lewat jalur yang sama seperti kamera.
describe("model kata BISINDO", () => {
  const root = resolve(__dirname, "../../../..");
  const model: WordModel = JSON.parse(readFileSync(resolve(root, "models/bisindo-kata.json"), "utf8"));
  const samples: {
    label: string;
    frames: { t: number; hands: number[][][]; pose: number[][] | null }[];
    features: number[][];
    probs: number[];
  }[] = JSON.parse(readFileSync(resolve(root, "models/bisindo-kata.samples.json"), "utf8"));
  const toPoints = (rows: number[][]) => rows.map(([x, y, z]) => ({ x, y, z }));

  it("salinan di public sama dengan hasil pelatihan", () => {
    const served = readFileSync(resolve(root, "Frontend/public/models/bisindo-kata.json"), "utf8");
    expect(served).toBe(readFileSync(resolve(root, "models/bisindo-kata.json"), "utf8"));
  });

  it("semua kata model dan pasangan mirip ada di kamus", () => {
    const known = new Set(BISINDO_WORDS.map((word) => word.label));
    expect(model.labels.filter((label) => !known.has(label))).toEqual([]);
    expect(BISINDO_SIMILAR.flatMap((pair) => pair.words).filter((label) => !known.has(label))).toEqual([]);
  });

  for (const sample of samples) {
    it(`menghasilkan fitur dan peluang yang sama untuk video "${sample.label}"`, () => {
      const segmenter = new SignSegmenter();
      const signs = [];
      for (const frame of sample.frames) {
        const event = segmenter.push(frame.hands.map(toPoints), frame.pose && toPoints(frame.pose), frame.t);
        if (event?.type === "sign") signs.push(event);
      }
      const end = sample.frames[sample.frames.length - 1].t + GAP_MS + 100;
      const last = segmenter.push([], null, end);
      if (last?.type === "sign") signs.push(last);

      // Seperti di Python: dari video latih dipakai bagian dengan frame terbanyak
      const longest = signs.reduce((best, sign) => (sign.frames.length > best.frames.length ? sign : best));
      longest.sequence.forEach((row, t) =>
        row.forEach((value, i) => expect(value).toBeCloseTo(sample.features[t][i], 4))
      );
      wordProbabilities(model, longest.sequence).forEach((p, i) => expect(p).toBeCloseTo(sample.probs[i], 4));
      expect(predictWord(model, longest.sequence).label).toBe(sample.label);
    });
  }
});
