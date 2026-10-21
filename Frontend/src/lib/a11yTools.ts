// Alat aksesibilitas tambahan di panel melayang (lihat AccessibilityPanel.tsx). Ini
// melengkapi pengaturan akun (ukuran teks, kontras, font disleksia, kurangi gerak) dan
// disimpan di perangkat saja, karena sifatnya penyesuaian tampilan sesaat.

export type A11yTools = {
  lineHeight: boolean;
  alignLeft: boolean;
  grayscale: boolean;
  hideImages: boolean;
  highlightLinks: boolean;
  strongFocus: boolean;
  readingMask: boolean;
};

export const defaultA11yTools: A11yTools = {
  lineHeight: false,
  alignLeft: false,
  grayscale: false,
  hideImages: false,
  highlightLinks: false,
  strongFocus: false,
  readingMask: false,
};

// Kelas pada <html> untuk tiap alat; aturannya ada di index.css. Masker baca berupa komponen.
export const A11Y_TOOLS: { key: keyof A11yTools; className: string | null }[] = [
  { key: "lineHeight", className: "a11y-line-height" },
  { key: "alignLeft", className: "a11y-align-left" },
  { key: "grayscale", className: "a11y-grayscale" },
  { key: "hideImages", className: "a11y-hide-images" },
  { key: "highlightLinks", className: "a11y-links" },
  { key: "strongFocus", className: "a11y-focus" },
  { key: "readingMask", className: null },
];

export const A11Y_STORAGE_KEY = "hopeA11yTools";

type ClassToggler = { toggle: (name: string, force: boolean) => unknown };

export const applyA11yTools = (classList: ClassToggler, tools: A11yTools) => {
  for (const { key, className } of A11Y_TOOLS) {
    if (className) classList.toggle(className, tools[key]);
  }
};

// Data dari penyimpanan perangkat bisa rusak atau dari versi lama: ambil yang dikenal saja
export const parseA11yTools = (raw: string | null): A11yTools => {
  if (!raw) return { ...defaultA11yTools };
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const result = { ...defaultA11yTools };
    for (const key of Object.keys(defaultA11yTools) as (keyof A11yTools)[]) {
      if (typeof data[key] === "boolean") result[key] = data[key] as boolean;
    }
    return result;
  } catch {
    return { ...defaultA11yTools };
  }
};
