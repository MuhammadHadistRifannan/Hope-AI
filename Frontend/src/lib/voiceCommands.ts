import { useEffect, useRef } from "react";

// Perintah suara disiarkan ke halaman yang sedang terbuka lewat event ini.
// Halaman yang mengenali perintahnya memanggil preventDefault() supaya asisten
// tahu perintah sudah ditangani.
export const VOICE_EVENT = "hopeai:voice";
// Meminta asisten suara mulai mendengarkan, dari tombol mana pun di aplikasi
export const VOICE_TOGGLE_EVENT = "hopeai:voice-toggle";
export const requestVoiceInput = () => window.dispatchEvent(new Event(VOICE_TOGGLE_EVENT));

export const normalizeCommand = (transcript: string) =>
  transcript
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Mengembalikan true bila ada halaman yang menangani perintah
export const dispatchVoiceCommand = (transcript: string) => {
  const event = new CustomEvent<string>(VOICE_EVENT, {
    detail: normalizeCommand(transcript),
    cancelable: true,
  });
  return !window.dispatchEvent(event);
};

// Dipakai halaman untuk menerima perintah suara. Handler mengembalikan true
// bila perintah dikenali.
export const useVoiceCommands = (handler: (command: string) => boolean) => {
  const latest = useRef(handler);
  latest.current = handler;

  useEffect(() => {
    const listener = (event: Event) => {
      const command = (event as CustomEvent<string>).detail;
      if (latest.current(command)) event.preventDefault();
    };
    window.addEventListener(VOICE_EVENT, listener);
    return () => window.removeEventListener(VOICE_EVENT, listener);
  }, []);
};

type Destination = { path: string; name: string; keywords: string[] };

export const destinations: Destination[] = [
  { path: "/", name: "Beranda", keywords: ["beranda", "halaman utama", "home"] },
  { path: "/eyeread", name: "EyeRead", keywords: ["eyeread", "eye read", "airit", "pindai buku", "baca buku", "kamera"] },
  { path: "/neotutor", name: "NeoTutor", keywords: ["neotutor", "neo tutor", "tutor"] },
  { path: "/flexa", name: "Flexa", keywords: ["flexa", "fleksa", "materi", "kamus isyarat"] },
  { path: "/pathly", name: "Pathly", keywords: ["pathly", "patli", "jalur belajar", "latihan", "permainan"] },
  { path: "/forum", name: "Forum", keywords: ["forum", "diskusi"] },
  { path: "/profile", name: "Profil", keywords: ["profil"] },
  { path: "/notifications", name: "Notifikasi", keywords: ["notifikasi", "pemberitahuan"] },
  { path: "/settings", name: "Pengaturan", keywords: ["pengaturan", "setelan", "setting"] },
  { path: "/guru", name: "Ruang Guru", keywords: ["ruang guru"] },
];

// "buka flexa", "ke forum", "pergi ke pengaturan", atau cukup "beranda"
export const findDestination = (command: string) => {
  const asksToGo = /^(buka|bukakan|ke|pergi ke|pindah ke|menuju|tampilkan)\b/.test(command);
  const isShort = command.split(" ").length <= 2;
  if (!asksToGo && !isShort) return null;

  return (
    destinations.find((destination) =>
      destination.keywords.some((keyword) => command.includes(keyword))
    ) ?? null
  );
};

export const helpText =
  "Kamu bisa bilang: buka EyeRead, buka NeoTutor, buka Flexa, buka Pathly, buka Forum, atau buka Pengaturan. " +
  "Katakan baca halaman untuk mendengar isi halaman, dan berhenti untuk menghentikan suara. " +
  "Untuk bertanya ke tutor, katakan tanya, lalu pertanyaanmu. " +
  "Di EyeRead, katakan mulai kamera, lalu ambil gambar. " +
  "Saat kuis, katakan A, B, C, atau D untuk menjawab, lalu lanjut.";
