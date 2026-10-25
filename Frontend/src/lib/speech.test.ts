import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({ API_URL: "", authHeaders: async () => ({}) }));
vi.mock("@/lib/voice", () => ({ applyIndonesianVoice: () => undefined }));
vi.mock("@/lib/cues", () => ({ announceCaption: () => undefined }));

// Suara perangkat palsu yang tidak pernah memanggil onend, seperti Chrome Android sesekali
const synth = { speaking: false, pending: false, speak: vi.fn(), cancel: vi.fn() };

beforeEach(() => {
  vi.useFakeTimers();
  synth.speak.mockReset();
  synth.cancel.mockReset();
  vi.stubGlobal("window", { speechSynthesis: synth });
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const device = { volume: 100, rate: "normal", aiVoice: false };

describe("speak", () => {
  it("bacaan yang dipotong bacaan lain tetap memanggil onEnd, sebelum bacaan baru dimulai", async () => {
    const { speak } = await import("./speech");
    const events: string[] = [];
    synth.speaking = true;
    speak("Halaman pertama", { ...device, onStart: () => events.push("mulai 1"), onEnd: () => events.push("selesai 1") });
    speak("Halaman kedua", { ...device, onStart: () => events.push("mulai 2"), onEnd: () => events.push("selesai 2") });
    expect(events).toEqual(["mulai 1", "selesai 1", "mulai 2"]);
  });

  it("stopSpeech memanggil onEnd bacaan yang sedang berjalan", async () => {
    const { speak, stopSpeech } = await import("./speech");
    const onEnd = vi.fn();
    synth.speaking = true;
    speak("Sebuah teks", { ...device, onEnd });
    stopSpeech();
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("menganggap selesai bila suara perangkat diam walau onend tidak muncul", async () => {
    const { speak } = await import("./speech");
    const onEnd = vi.fn();
    synth.speaking = true;
    const done = speak("Teks pendek", { ...device, onEnd });
    await vi.advanceTimersByTimeAsync(2000);
    expect(onEnd).not.toHaveBeenCalled();
    synth.speaking = false;
    await vi.advanceTimersByTimeAsync(4000);
    await done;
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
