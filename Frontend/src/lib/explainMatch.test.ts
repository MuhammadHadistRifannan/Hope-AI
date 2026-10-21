import { describe, expect, it } from "vitest";
import { findParagraph, splitParagraphs, splitSentences } from "./explainMatch";

const material = [
  "Angka adalah simbol yang dipakai untuk mewakili bilangan.",
  "Ada sepuluh digit dasar, yaitu 0, 1, 2, 3, 4, 5, 6, 7, 8, dan 9. Angka nol berarti tidak ada benda sama sekali.",
  "Digit-digit itu digabungkan untuk membentuk bilangan yang lebih besar, misalnya 1 dan 2 menjadi 12.",
].join("\n\n");

describe("splitParagraphs", () => {
  it("memecah per baris kosong, atau per baris bila tidak ada baris kosong", () => {
    expect(splitParagraphs(material)).toHaveLength(3);
    expect(splitParagraphs("Baris satu\nBaris dua")).toEqual(["Baris satu", "Baris dua"]);
    expect(splitParagraphs("  \n\n ")).toEqual([]);
  });
});

describe("findParagraph", () => {
  const paragraphs = splitParagraphs(material);

  it("menemukan paragraf yang membahas butir umpan balik", () => {
    expect(findParagraph(paragraphs, "Angka adalah simbol yang mewakili bilangan.")).toBe(0);
    expect(findParagraph(paragraphs, "Digit dasar adalah angka 0 hingga 9.")).toBe(1);
    expect(findParagraph(paragraphs, "Angka nol berarti tidak ada, bukan paling banyak.")).toBe(1);
    expect(findParagraph(paragraphs, "Kombinasi digit membentuk bilangan lebih besar.")).toBe(2);
  });

  it("tidak menunjuk paragraf bila butirnya tidak dibahas di materi", () => {
    expect(findParagraph(paragraphs, "Fotosintesis terjadi di daun.")).toBe(-1);
    expect(findParagraph(paragraphs, "")).toBe(-1);
  });
});

describe("splitSentences", () => {
  it("memecah materi satu paragraf menjadi kalimat yang bisa ditunjuk", () => {
    const sentences = splitSentences(
      "Angka adalah simbol. Kita mengenal 0 hingga 9 sebagai digit dasar! Digit digabung jadi bilangan besar"
    );
    expect(sentences.map((sentence) => sentence.text)).toEqual([
      "Angka adalah simbol.",
      "Kita mengenal 0 hingga 9 sebagai digit dasar!",
      "Digit digabung jadi bilangan besar",
    ]);
    expect(findParagraph(sentences.map((sentence) => sentence.text), "Digit dasar adalah angka 0 hingga 9")).toBe(1);
  });

  it("mencatat paragraf asal setiap kalimat", () => {
    expect(splitSentences("Satu. Dua.\n\nTiga.").map((sentence) => sentence.paragraph)).toEqual([0, 0, 1]);
  });
});
