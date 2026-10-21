import { describe, expect, it } from "vitest";
import { A11Y_TOOLS, applyA11yTools, defaultA11yTools, parseA11yTools } from "./a11yTools";

// classList tiruan: cukup untuk memeriksa kelas mana yang menyala
const fakeClassList = () => {
  const on = new Set<string>();
  return { on, toggle: (name: string, force: boolean) => (force ? on.add(name) : on.delete(name)) };
};

describe("applyA11yTools", () => {
  it("hanya menyalakan kelas alat yang aktif", () => {
    const list = fakeClassList();
    applyA11yTools(list, { ...defaultA11yTools, grayscale: true, highlightLinks: true });
    expect([...list.on].sort()).toEqual(["a11y-grayscale", "a11y-links"]);
  });

  it("mematikan kelas yang sebelumnya menyala", () => {
    const list = fakeClassList();
    applyA11yTools(list, { ...defaultA11yTools, hideImages: true });
    applyA11yTools(list, defaultA11yTools);
    expect(list.on.size).toBe(0);
  });

  it("setiap alat punya kelas CSS sendiri", () => {
    const classes = A11Y_TOOLS.map((tool) => tool.className).filter(Boolean);
    expect(new Set(classes).size).toBe(classes.length);
  });
});

describe("parseA11yTools", () => {
  it("memakai bawaan untuk data rusak atau kosong", () => {
    expect(parseA11yTools(null)).toEqual(defaultA11yTools);
    expect(parseA11yTools("{rusak")).toEqual(defaultA11yTools);
  });

  it("hanya menerima kunci yang dikenal dengan nilai boolean", () => {
    const parsed = parseA11yTools(JSON.stringify({ grayscale: true, lineHeight: "ya", lain: true }));
    expect(parsed).toEqual({ ...defaultA11yTools, grayscale: true });
  });
});
