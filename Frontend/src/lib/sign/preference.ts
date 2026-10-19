// Pilihan bahasa isyarat terakhir (SIBI atau BISINDO), disimpan di perangkat ini saja.
// Pilihan lama "otomatis" dari versi sebelumnya kembali ke SIBI.

export type SignLanguage = "sibi" | "bisindo";

const KEY = "hopeAiSignLanguage";

export const readSignPreference = (): SignLanguage => {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return saved.language === "bisindo" ? "bisindo" : "sibi";
  } catch {
    return "sibi";
  }
};

export const saveSignPreference = (language: SignLanguage) => {
  try {
    localStorage.setItem(KEY, JSON.stringify({ language }));
  } catch {
    // Penyimpanan perangkat tidak tersedia (mode privat); pilihan berlaku selama halaman terbuka
  }
};
