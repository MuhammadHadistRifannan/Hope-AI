import { describe, expect, it } from "vitest";
import { Stabilizer } from "./stabilizer";

const options = { minConfidence: 0.8, holdMs: 700, releaseMs: 350 };

// Menjalankan tebakan yang sama tiap 33 ms (sekitar 30 frame per detik)
const feed = (s: Stabilizer, label: string | null, confidence: number, from: number, durationMs: number) => {
  const accepted: string[] = [];
  let t = from;
  for (; t < from + durationMs; t += 33) {
    const result = s.push(label, confidence, t);
    if (result) accepted.push(result);
  }
  return { accepted, end: t };
};

describe("Stabilizer", () => {
  it("tidak menerima isyarat yang hanya muncul sekilas", () => {
    const s = new Stabilizer(options);
    expect(feed(s, "A", 0.95, 0, 300).accepted).toEqual([]);
  });

  it("menerima isyarat yang bertahan cukup lama, satu kali saja", () => {
    const s = new Stabilizer(options);
    expect(feed(s, "A", 0.95, 0, 3000).accepted).toEqual(["A"]);
  });

  it("mengabaikan tebakan dengan keyakinan rendah", () => {
    const s = new Stabilizer(options);
    expect(feed(s, "A", 0.6, 0, 3000).accepted).toEqual([]);
    expect(s.state).toBe("unsure");
  });

  it("menghitung ulang bila tebakan berubah di tengah jalan", () => {
    const s = new Stabilizer(options);
    const first = feed(s, "A", 0.95, 0, 500);
    const second = feed(s, "B", 0.95, first.end, 500);
    expect([...first.accepted, ...second.accepted]).toEqual([]);
    expect(feed(s, "B", 0.95, second.end, 400).accepted).toEqual(["B"]);
  });

  it("menerima rangkaian isyarat yang berbeda secara berurutan", () => {
    const s = new Stabilizer(options);
    const a = feed(s, "S", 0.95, 0, 1000);
    const b = feed(s, "A", 0.95, a.end, 1000);
    const c = feed(s, "Y", 0.95, b.end, 1000);
    expect([...a.accepted, ...b.accepted, ...c.accepted]).toEqual(["S", "A", "Y"]);
  });

  it("menerima huruf yang sama lagi setelah tangan diturunkan sejenak", () => {
    const s = new Stabilizer(options);
    const first = feed(s, "A", 0.95, 0, 1000);
    const pause = feed(s, null, 0, first.end, 500);
    const second = feed(s, "A", 0.95, pause.end, 1000);
    expect([...first.accepted, ...second.accepted]).toEqual(["A", "A"]);
  });

  it("tidak menggandakan huruf saat ada satu frame goyah", () => {
    const s = new Stabilizer(options);
    const first = feed(s, "A", 0.95, 0, 1000);
    s.push("A", 0.5, first.end); // satu frame ragu
    const second = feed(s, "A", 0.95, first.end + 33, 1000);
    expect([...first.accepted, ...second.accepted]).toEqual(["A"]);
  });

  it("melaporkan kemajuan menuju diterima", () => {
    const s = new Stabilizer(options);
    s.push("A", 0.95, 0);
    s.push("A", 0.95, 350);
    expect(s.state).toBe("holding");
    expect(s.progress).toBeCloseTo(0.5, 1);
  });
});
