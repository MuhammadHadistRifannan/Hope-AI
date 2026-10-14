import { describe, expect, it } from "vitest";
import { HELP_ENTRIES, HELP_SUGGESTIONS, findAnswer } from "./helpChat";

const id = (text: string) => findAnswer(text)?.id ?? null;

describe("helpChat", () => {
  it("menjawab pertanyaan umum dengan berbagai cara bertanya", () => {
    expect(id("Hope.Ai itu apa?")).toBe("apa");
    expect(id("ini gratis ga?")).toBe("gratis");
    expect(id("harus bayar?")).toBe("gratis");
    expect(id("fitur nya apa aja")).toBe("fitur");
    expect(id("kalau saya tunanetra bisa pakai?")).toBe("netra");
    expect(id("ada bahasa isyarat?")).toBe("tuli");
    expect(id("anak saya disleksia")).toBe("disleksia");
    expect(id("cara daftar gimana")).toBe("daftar");
    expect(id("apakah data saya aman")).toBe("privasi");
    expect(id("bisa di hp android?")).toBe("perangkat");
    expect(id("siapa yang membuat")).toBe("pembuat");
  });

  it("memilih jawaban yang lebih khusus", () => {
    // "lupa password" lebih khusus daripada "login"
    expect(id("saya lupa password, tidak bisa login")).toBe("sandi");
    expect(id("hope run itu game apa")).toBe("permainan");
    // Menyebut nama Hope.Ai tidak menggeser jawaban ke "Hope.Ai itu apa"
    expect(id("hope ai gratis?")).toBe("gratis");
    expect(id("apa itu hope ai")).toBe("apa");
  });

  it("jujur saat pertanyaan di luar cakupan", () => {
    expect(findAnswer("berapa 12 dikali 7")).toBeNull();
    expect(findAnswer("jelaskan fotosintesis")).toBeNull();
    expect(findAnswer("kerjakan PR matematika saya")).toBeNull();
    expect(findAnswer("")).toBeNull();
    expect(findAnswer("?")).toBeNull();
  });

  it("kata kunci dicocokkan sebagai kata utuh", () => {
    // "hp" tidak boleh cocok di tengah kata lain
    expect(findAnswer("alhpabet")).toBeNull();
  });

  it("setiap tombol saran punya jawabannya, dan setiap pertanyaan menemukan dirinya sendiri", () => {
    for (const suggestion of HELP_SUGGESTIONS) expect(HELP_ENTRIES.some((entry) => entry.id === suggestion)).toBe(true);
    for (const entry of HELP_ENTRIES) expect(id(entry.question)).toBe(entry.id);
  });
});
