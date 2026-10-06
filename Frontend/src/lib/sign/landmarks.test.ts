import { describe, expect, it } from "vitest";
import { FEATURE_SIZE, toFeatures, type Point } from "./landmarks";
import { predict, type SignModel } from "./classifier";

const hand = (dx = 0, dy = 0, scale = 1): Point[] =>
  Array.from({ length: 21 }, (_, i) => ({
    x: dx + scale * (0.01 * i + 0.002 * (i % 4)),
    y: dy - scale * 0.012 * i,
    z: scale * 0.001 * (i % 5),
  }));

describe("toFeatures", () => {
  it("menghasilkan 63 nilai dengan pergelangan di titik nol", () => {
    const features = toFeatures(hand(0.3, 0.6), "Right")!;
    expect(features).toHaveLength(FEATURE_SIZE);
    expect(features.slice(0, 3)).toEqual([0, 0, 0]);
  });

  it("tidak terpengaruh posisi tangan di layar maupun jaraknya dari kamera", () => {
    const a = toFeatures(hand(0.1, 0.2, 1), "Right")!;
    const b = toFeatures(hand(0.7, 0.8, 2.5), "Right")!;
    a.forEach((value, i) => expect(b[i]).toBeCloseTo(value, 6));
  });

  it("mencerminkan tangan kiri sehingga sama dengan tangan kanan", () => {
    const right = hand(0.5, 0.5);
    const left = right.map((p) => ({ ...p, x: 1 - p.x }));
    const a = toFeatures(right, "Right")!;
    const b = toFeatures(left, "Left")!;
    a.forEach((value, i) => expect(b[i]).toBeCloseTo(value, 6));
  });

  it("menolak masukan yang tidak lengkap atau tangan berukuran nol", () => {
    expect(toFeatures(hand().slice(0, 10), "Right")).toBeNull();
    expect(toFeatures(Array.from({ length: 21 }, () => ({ x: 1, y: 1, z: 0 })), "Right")).toBeNull();
  });
});

describe("predict", () => {
  // Model dua kelas dengan dua ciri: kelas ditentukan oleh ciri yang lebih besar
  const model: SignModel = {
    labels: ["A", "B"],
    mean: [0, 0],
    std: [1, 1],
    layers: [
      { weights: [[1, 0], [0, 1]], bias: [0, 0] },
      { weights: [[4, -4], [-4, 4]], bias: [0, 0] },
    ],
  };

  it("memilih kelas dengan skor tertinggi dan keyakinan antara 0 dan 1", () => {
    expect(predict(model, [2, 0]).label).toBe("A");
    expect(predict(model, [0, 2]).label).toBe("B");
    const { confidence } = predict(model, [2, 0]);
    expect(confidence).toBeGreaterThan(0.99);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("kurang yakin saat masukan berada di tengah-tengah", () => {
    expect(predict(model, [1, 1]).confidence).toBeCloseTo(0.5, 5);
  });
});
