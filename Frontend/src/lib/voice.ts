// Suara dibacakan oleh mesin text-to-speech bawaan browser (Web Speech API).
// Kualitasnya bergantung pada suara yang terpasang di perangkat, jadi di sini
// dipilih suara Bahasa Indonesia terbaik yang tersedia.

const isIndonesian = (voice: SpeechSynthesisVoice) =>
  /^(id|in)([-_]|$)/i.test(voice.lang);

// Suara daring (Google, Microsoft "Natural/Online") jauh lebih jelas
// daripada suara robotik bawaan sistem seperti eSpeak
const quality = (voice: SpeechSynthesisVoice) => {
  const name = voice.name.toLowerCase();
  let score = 0;
  if (name.includes("natural") || name.includes("online")) score += 4;
  if (name.includes("google")) score += 3;
  if (!voice.localService) score += 1;
  if (name.includes("espeak")) score -= 5;
  return score;
};

let cached: SpeechSynthesisVoice | null | undefined;

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  // Daftar suara dimuat browser secara asinkron; pilih ulang saat daftarnya berubah
  window.speechSynthesis.addEventListener?.("voiceschanged", () => {
    cached = undefined;
  });
  window.speechSynthesis.getVoices();
}

export const indonesianVoice = (): SpeechSynthesisVoice | null => {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  if (cached !== undefined) return cached;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null; // belum dimuat; coba lagi pada panggilan berikutnya

  const candidates = voices.filter(isIndonesian).sort((a, b) => quality(b) - quality(a));
  cached = candidates[0] ?? null;
  return cached;
};

// Memasang suara Bahasa Indonesia terbaik pada sebuah ucapan
export const applyIndonesianVoice = (utterance: SpeechSynthesisUtterance) => {
  const voice = indonesianVoice();
  utterance.lang = voice?.lang ?? "id-ID";
  if (voice) utterance.voice = voice;
};
