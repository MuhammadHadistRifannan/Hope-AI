import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { normalizeLandmarks, toFeatures, toPixels, type Point } from "./landmarks";
import { predict, type SignModel } from "./classifier";

const hand = (offsetX = 0, offsetY = 0, size = 1): Point[] =>
  Array.from({ length: 21 }, (_, i) => ({
    x: offsetX + size * Math.cos(i) * (i % 5 + 1),
    y: offsetY + size * (i + 1),
    z: size * (i % 3) * 0.1,
  }));

describe("normalizeLandmarks", () => {
  it("menjadikan pergelangan pusat dan jarak titik 0-9 bernilai 1", () => {
    const features = normalizeLandmarks(hand(5, 7, 3))!;
    expect(features.slice(0, 3)).toEqual([0, 0, 0]);
    expect(Math.hypot(features[27], features[28])).toBeCloseTo(1, 6);
  });

  it("tidak berubah oleh posisi dan ukuran tangan di layar", () => {
    const a = normalizeLandmarks(hand(0, 0, 1))!;
    const b = normalizeLandmarks(hand(40, -12, 2.5))!;
    a.forEach((value, i) => expect(b[i]).toBeCloseTo(value, 6));
  });

  it("menolak jumlah titik yang salah", () => {
    expect(normalizeLandmarks(hand().slice(0, 20))).toBeNull();
  });

  it("mengubah koordinat 0..1 menjadi piksel seperti notebook", () => {
    const [p] = toPixels([{ x: 0.5, y: 0.25, z: -0.1 }], 640, 480);
    expect(p).toEqual({ x: 320, y: 120, z: -64 });
    expect(toFeatures(hand(), 640, 480)).toHaveLength(63);
  });
});

// Memastikan normalisasi dan inferensi di browser sama dengan notebook:
// model hasil Colab dijalankan pada landmark yang dipakai melatihnya.
describe("model SIBI", () => {
  const root = resolve(__dirname, "../../../..");
  const model: SignModel = JSON.parse(readFileSync(resolve(root, "models/sibi-abjad.json"), "utf8"));
  const [header, ...lines] = readFileSync(resolve(root, "models/landmarks_from_images.csv"), "utf8")
    .trim()
    .split("\n");
  const columns = header.split(",");
  const firstX = columns.indexOf("x0");

  it("mengenali landmark data latih dengan akurasi seperti di notebook", () => {
    // Satu dari tiap 5 baris, agar tes tetap cepat
    const sample = lines.filter((_, i) => i % 5 === 0);
    let correct = 0;
    for (const line of sample) {
      const cells = line.split(",");
      const values = cells.slice(firstX, firstX + 63).map(Number);
      const points = Array.from({ length: 21 }, (_, i) => ({
        x: values[i * 3],
        y: values[i * 3 + 1],
        z: values[i * 3 + 2],
      }));
      if (predict(model, normalizeLandmarks(points)!).label === cells[0]) correct++;
    }
    expect(correct / sample.length).toBeGreaterThan(0.93);
  });
});
