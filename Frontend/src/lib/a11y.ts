import type { KeyboardEvent } from "react";

// Membuat elemen non-tombol (kartu yang bisa diklik) dapat dipakai lewat keyboard
// dan dikenali pembaca layar sebagai tombol.
export const clickable = (onActivate: () => void, label?: string) => ({
  role: "button" as const,
  tabIndex: 0,
  "aria-label": label,
  onClick: onActivate,
  onKeyDown: (event: KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  },
});
