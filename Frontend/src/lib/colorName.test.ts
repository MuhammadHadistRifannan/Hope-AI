import { describe, expect, it } from "vitest";
import { averageColor, nameColor } from "./colorName";

const hex = (value: string) => {
  const n = parseInt(value.replace("#", ""), 16);
  return nameColor((n >> 16) & 255, (n >> 8) & 255, n & 255).name;
};

describe("nameColor", () => {
  it("menamai warna dasar", () => {
    expect(hex("#FF0000")).toBe("merah");
    expect(hex("#00A000")).toBe("hijau");
    expect(hex("#0000FF")).toBe("biru");
    expect(hex("#FFFF00")).toBe("kuning");
    expect(hex("#FFA500")).toBe("oranye");
    expect(hex("#40E0D0")).toBe("toska");
  });

  it("membedakan muda dan tua", () => {
    expect(hex("#87CEEB")).toBe("biru muda");
    expect(hex("#00008B")).toBe("biru tua");
    expect(hex("#006400")).toBe("hijau tua");
    expect(hex("#800080")).toBe("ungu tua");
    expect(hex("#FFC0CB")).toBe("merah muda");
  });

  it("mengenali coklat dan warna netral", () => {
    expect(hex("#8B4513")).toBe("coklat");
    expect(hex("#000000")).toBe("hitam");
    expect(hex("#FFFFFF")).toBe("putih");
    expect(hex("#808080")).toBe("abu-abu");
    expect(hex("#D3D3D3")).toBe("abu-abu muda");
  });

  it("mengembalikan kode hex untuk contoh warna", () => {
    expect(nameColor(255, 0, 0).hex).toBe("#ff0000");
  });
});

describe("averageColor", () => {
  it("merata-ratakan piksel RGBA dan mengabaikan alfa", () => {
    const pixels = [255, 0, 0, 255, 0, 0, 255, 0];
    expect(averageColor(pixels)).toEqual({ r: 128, g: 0, b: 128 });
  });

  it("aman untuk data kosong", () => {
    expect(averageColor([])).toEqual({ r: 0, g: 0, b: 0 });
  });
});
