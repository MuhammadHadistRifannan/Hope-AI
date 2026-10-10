import { describe, expect, it } from "vitest";
import { checkMaterial, visualReferences } from "./materialChecks";

const result = (title: string, content: string) =>
  Object.fromEntries(checkMaterial(title, content).map((check) => [check.id, check.ok]));

describe("checkMaterial", () => {
  it("meloloskan materi yang pendek dan jelas", () => {
    expect(result("Fotosintesis", "Tumbuhan membuat makanan sendiri. Prosesnya butuh sinar matahari.")).toEqual({
      title: true,
      paragraphs: true,
      sentences: true,
      caps: true,
    });
  });

  it("menandai judul kosong, kalimat panjang, dan huruf kapital semua", () => {
    const longSentence = Array.from({ length: 35 }, (_, i) => `kata${i}`).join(" ") + ".";
    const checks = result("", `${longSentence}\nINI ADALAH BAGIAN YANG SANGAT PENTING.`);
    expect(checks.title).toBe(false);
    expect(checks.sentences).toBe(false);
    expect(checks.caps).toBe(false);
  });

  it("menandai paragraf lebih dari 120 kata", () => {
    const paragraph = Array.from({ length: 130 }, () => "kata").join(" ");
    expect(result("Judul materi", paragraph).paragraphs).toBe(false);
  });
});

describe("visualReferences", () => {
  it("menemukan rujukan ke gambar, tabel, dan video", () => {
    expect(visualReferences("Perhatikan Gambar 1 dan tabel berikut. Tonton video ini.")).toEqual([
      "gambar",
      "tabel",
      "video",
    ]);
    expect(visualReferences("Tumbuhan butuh air.")).toEqual([]);
  });
});
