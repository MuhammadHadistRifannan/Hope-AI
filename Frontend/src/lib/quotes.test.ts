import { describe, expect, it } from "vitest";
import { QUOTES, quoteOfDay } from "./quotes";

describe("quoteOfDay", () => {
  it("memberi kutipan yang sama sepanjang satu hari", () => {
    const morning = quoteOfDay(new Date(2026, 9, 21, 6, 0));
    const night = quoteOfDay(new Date(2026, 9, 21, 23, 59));
    expect(morning).toBe(night);
  });

  it("berganti ke kutipan berikutnya keesokan harinya", () => {
    const today = QUOTES.indexOf(quoteOfDay(new Date(2026, 9, 21)));
    const tomorrow = QUOTES.indexOf(quoteOfDay(new Date(2026, 9, 22)));
    expect(tomorrow).toBe((today + 1) % QUOTES.length);
  });

  it("tetap berurutan saat pergantian tahun", () => {
    const lastDay = QUOTES.indexOf(quoteOfDay(new Date(2026, 11, 31)));
    const newYear = QUOTES.indexOf(quoteOfDay(new Date(2027, 0, 1)));
    expect(newYear).toBe((lastDay + 1) % QUOTES.length);
  });

  it("setiap kutipan punya tokoh dan sumber", () => {
    for (const quote of QUOTES) {
      expect(quote.text.length).toBeGreaterThan(10);
      expect(quote.author.length).toBeGreaterThan(2);
      expect(quote.source.length).toBeGreaterThan(2);
    }
  });
});
