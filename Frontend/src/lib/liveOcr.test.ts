import { describe, expect, it } from "vitest";
import { LIVE_OCR, motion, sharpness, textSimilarity, toGray } from "./liveOcr";

const W = 32;
const H = 24;
const image = (pixel: (x: number, y: number) => number) => {
  const gray = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) gray[y * W + x] = pixel(x, y);
  return gray;
};

describe("toGray", () => {
  it("mengubah RGBA menjadi kecerahan", () => {
    const rgba = [255, 255, 255, 255, 0, 0, 0, 255];
    const gray = toGray(rgba, 2, 1);
    expect(gray[0]).toBeCloseTo(255, 3);
    expect(gray[1]).toBe(0);
  });
});

describe("sharpness", () => {
  it("garis-garis tegas lebih tajam daripada gambar rata", () => {
    const flat = image(() => 128);
    const stripes = image((x) => (x % 4 < 2 ? 0 : 255));
    expect(sharpness(stripes, W, H)).toBeGreaterThan(sharpness(flat, W, H) + 1000);
    expect(sharpness(flat, W, H)).toBe(0);
  });
});

describe("motion", () => {
  it("nol untuk gambar yang sama dan besar untuk gambar berbeda", () => {
    const a = image((x) => x * 4);
    const b = image((x) => 255 - x * 4);
    expect(motion(a, a)).toBe(0);
    expect(motion(a, b)).toBeGreaterThan(50);
  });

  it("tidak diam bila belum ada gambar sebelumnya", () => {
    expect(motion(image(() => 0), null)).toBe(Infinity);
  });
});

describe("textSimilarity", () => {
  it("halaman yang sama tetap dianggap mirip walau OCR sedikit berbeda", () => {
    const a = "Fotosintesis adalah proses tumbuhan membuat makanan sendiri.";
    const b = "Fotosintesis adalah proses tumbuhan membuat makanan sendiri";
    expect(textSimilarity(a, b)).toBe(1);
    expect(textSimilarity(a, "Fotosintesis adalah prses tumbuhan membuat makanan")).toBeGreaterThan(0.5);
  });

  it("halaman berbeda dianggap baru", () => {
    expect(textSimilarity("Bab satu tentang bilangan bulat", "Gravitasi menarik benda ke bumi")).toBeLessThan(0.2);
  });
});

describe("ambang Mode Langsung", () => {
  // Halaman berisi "baris tulisan": garis gelap tiap 4 piksel
  const page = image((x, y) => (y % 4 === 0 && x > 2 && x < W - 3 ? 30 : 230));

  it("getaran tangan dan noise kamera tetap dianggap diam", () => {
    let seed = 7;
    const noise = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280 - 0.5) * 16;
    const shaky = page.map((value) => value + noise());
    expect(motion(shaky, page)).toBeLessThan(LIVE_OCR.stillBelow);
  });

  it("halaman berbeda dianggap pemandangan baru", () => {
    const other = image((x, y) => ((y + 2) % 4 === 0 && x > 2 && x < W - 3 ? 30 : 230));
    expect(motion(other, page)).toBeGreaterThan(LIVE_OCR.changedAbove);
  });

  it("halaman bertulisan cukup tajam, dinding polos tidak", () => {
    expect(sharpness(page, W, H)).toBeGreaterThan(LIVE_OCR.sharpAbove);
    expect(sharpness(image(() => 180), W, H)).toBeLessThan(LIVE_OCR.sharpAbove);
  });
});
