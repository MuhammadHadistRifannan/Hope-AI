import { describe, expect, it } from "vitest";
import type { Point } from "./landmarks";
import {
  ROUTER_CONFIG, SignRouter, appendToTranscript, closeSpelling, removeLast, transcriptText,
  type RouterEvent, type TranscriptPart,
} from "./router";

// Tubuh dengan bahu 200 piksel dan pergelangan di bawah bahu
const pose: Point[] = Array.from({ length: 33 }, () => ({ x: 320, y: 300, z: 0 }));
pose[11] = { x: 420, y: 250, z: 0 };
pose[12] = { x: 220, y: 250, z: 0 };
pose[15] = { x: 420, y: 150, z: 0 };
pose[16] = { x: 220, y: 150, z: 0 };

// Tangan dengan ukuran 60 piksel (pergelangan ke titik 9), pergelangan di (x, y)
const hand = (x: number, y: number): Point[] =>
  Array.from({ length: 21 }, (_, i) => ({ x: x + (i % 5) * 8, y: y - (i === 9 ? 60 : i * 3), z: 0 }));

const FRAME_MS = 33;

type Step = { ms: number; hands: (t: number) => Point[][]; letter?: { label: string; confidence: number } };

const run = (router: SignRouter, steps: Step[]) => {
  const events: RouterEvent[] = [];
  let now = 1000;
  for (const step of steps) {
    const end = now + step.ms;
    for (; now < end; now += FRAME_MS) {
      const hands = step.hands(now);
      events.push(...router.push(hands, pose, hands.length ? step.letter ?? null : null, now));
    }
  }
  return events;
};

const still = (ms: number, label = "A"): Step => ({ ms, hands: () => [hand(420, 150)], letter: { label, confidence: 0.95 } });
const moving = (ms: number): Step => ({
  ms,
  hands: (t) => [hand(420 + 120 * Math.sin(t / 120), 150 + 40 * Math.cos(t / 90))],
  letter: { label: "D", confidence: 0.95 },
});
const down = (ms = 600): Step => ({ ms, hands: () => [] });
const halo = () => ({ label: "Halo", confidence: 0.95 });

describe("SignRouter", () => {
  it("satu tangan diam dengan huruf yakin menjadi huruf SIBI, bukan kata", () => {
    const events = run(new SignRouter(halo), [still(1000), down()]);
    expect(events.map((e) => [e.type, e.label, e.system])).toEqual([["letter", "A", "sibi"]]);
  });

  it("tangan yang bergerak dibaca sebagai kata BISINDO setelah diturunkan", () => {
    const events = run(new SignRouter(halo), [moving(1200), down()]);
    expect(events.map((e) => [e.type, e.label, e.system])).toEqual([["word", "Halo", "bisindo"]]);
  });

  it("dua tangan tidak pernah dibaca sebagai huruf SIBI", () => {
    const events = run(new SignRouter(halo), [
      { ms: 1000, hands: () => [hand(420, 150), hand(220, 150)], letter: { label: "A", confidence: 0.99 } },
      down(),
    ]);
    expect(events.map((e) => e.type)).toEqual(["word"]);
  });

  it("kata dengan keyakinan rendah menjadi belum yakin", () => {
    const events = run(new SignRouter(() => ({ label: "Minum", confidence: 0.4 })), [moving(1200), down()]);
    expect(events).toEqual([{ type: "unsure", system: "bisindo", label: "Minum", confidence: 0.4 }]);
  });

  it("mengeja beberapa huruf tanpa menurunkan tangan", () => {
    const events = run(new SignRouter(halo), [still(1000, "R"), moving(300), still(1000, "A"), down()]);
    expect(events.map((e) => e.label)).toEqual(["R", "A"]);
  });

  it("setelah tangan diturunkan, gerakan berikutnya kembali dibaca sebagai kata", () => {
    const events = run(new SignRouter(halo), [still(800), down(), moving(1200), down()]);
    expect(events.map((e) => e.type)).toEqual(["letter", "word"]);
  });

  // Waktu tahan dihitung setelah tangan terbaca diam (sekitar 240 ms)
  it("menahan 900 ms cukup bila SIBI diutamakan, belum cukup bila BISINDO diutamakan", () => {
    const sibi = run(new SignRouter(halo, ROUTER_CONFIG.sibi), [still(900), down()]);
    const bisindo = run(new SignRouter(halo, ROUTER_CONFIG.bisindo), [still(900), down()]);
    expect(sibi.map((e) => e.type)).toEqual(["letter"]);
    expect(bisindo.map((e) => e.type)).toEqual(["word"]);
  });
});

describe("teks mode Otomatis", () => {
  const letter = (label: string): RouterEvent => ({ type: "letter", system: "sibi", label, confidence: 0.9 });
  const word = (label: string): RouterEvent => ({ type: "word", system: "bisindo", label, confidence: 0.9, frames: [] });

  it("huruf berurutan menjadi satu ejaan, kata BISINDO berdiri sendiri", () => {
    let parts: TranscriptPart[] = [];
    for (const event of [word("Halo"), word("Saya"), letter("R"), letter("A"), letter("F"), letter("I")]) {
      parts = appendToTranscript(parts, event);
    }
    expect(parts.map((p) => [p.text, p.system])).toEqual([
      ["Halo", "bisindo"], ["Saya", "bisindo"], ["RAFI", "sibi"],
    ]);
    expect(transcriptText(parts)).toBe("halo saya rafi");
  });

  it("spasi memulai ejaan baru, hapus mengurangi satu huruf", () => {
    let parts = appendToTranscript([], letter("A"));
    parts = appendToTranscript(closeSpelling(parts), letter("B"));
    expect(parts.map((p) => p.text)).toEqual(["A", "B"]);
    parts = appendToTranscript(parts, letter("C"));
    expect(removeLast(parts).map((p) => p.text)).toEqual(["A", "B"]);
    expect(removeLast(removeLast(parts)).map((p) => p.text)).toEqual(["A"]);
  });
});
