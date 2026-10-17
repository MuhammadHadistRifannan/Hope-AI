// Pilihan bahasa isyarat terakhir, disimpan di perangkat ini saja.
// language: tombol yang terakhir dipilih. preferred: sistem yang diutamakan
// mode Otomatis saat ragu (SIBI atau BISINDO terakhir yang dipakai, atau
// pilihan langsung di mode Otomatis).

import type { SignSystem } from "./router";

export type SignLanguage = SignSystem | "otomatis";
export type SignPreference = { language: SignLanguage; preferred: SignSystem };

const KEY = "hopeAiSignLanguage";
const LANGUAGES: SignLanguage[] = ["sibi", "bisindo", "otomatis"];

export const readSignPreference = (): SignPreference => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    const language: SignLanguage = LANGUAGES.includes(saved.language) ? saved.language : "sibi";
    const preferred: SignSystem =
      saved.preferred === "sibi" || saved.preferred === "bisindo"
        ? saved.preferred
        : language === "bisindo" ? "bisindo" : "sibi";
    return { language, preferred };
  } catch {
    return { language: "sibi", preferred: "sibi" };
  }
};

export const saveSignPreference = (preference: SignPreference) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(preference));
  } catch {
    // Penyimpanan perangkat tidak tersedia (mode privat); pilihan berlaku selama halaman terbuka
  }
};
