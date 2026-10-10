// Saluran pengumuman untuk pengguna yang tidak mendengar suara aplikasi:
// - caption: teks dari setiap ucapan aplikasi (dipakai CaptionBar)
// - cue: pengganti bunyi efek, misalnya bunyi benar atau salah (kedipan layar)
export const CAPTION_EVENT = "hopeai:caption";
export const CUE_EVENT = "hopeai:cue";

export type CueTone = "info" | "success" | "error";

export const announceCaption = (text: string) => {
  if (typeof window === "undefined" || !text.trim()) return;
  window.dispatchEvent(new CustomEvent<string>(CAPTION_EVENT, { detail: text }));
};

export const visualCue = (message: string, tone: CueTone = "info") => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ message: string; tone: CueTone }>(CUE_EVENT, { detail: { message, tone } }));
};
