import { describe, expect, it } from "vitest";
import { predictForTarget, type SignModel } from "./classifier";

// Model mini: masukan [a, b, c] langsung menjadi skor huruf A, B, C (softmax)
const model: SignModel = {
  labels: ["A", "B", "C"],
  input_size: 3,
  layers: [{ W: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], b: [0, 0, 0], activation: "softmax" }],
};

describe("predictForTarget (latihan SIBI)", () => {
  it("menerima huruf target yang bersaing ketat walau bukan tebakan teratas", () => {
    // Peluang kira-kira A 0,58, B 0,39, C 0,03
    const { prediction, matchesTarget } = predictForTarget(model, [3, 2.6, 0], "B");
    expect(matchesTarget).toBe(true);
    expect(prediction.label).toBe("B");
  });

  it("menolak huruf target yang peluangnya kecil", () => {
    const { prediction, matchesTarget } = predictForTarget(model, [5, 0, 0], "C");
    expect(matchesTarget).toBe(false);
    expect(prediction.label).toBe("A");
  });

  it("tanpa target memakai tebakan teratas", () => {
    expect(predictForTarget(model, [0, 4, 0], undefined).prediction.label).toBe("B");
  });
});
